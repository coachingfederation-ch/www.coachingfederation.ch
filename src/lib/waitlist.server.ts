/**
 * Waitlist — server-only logic.
 *
 * A waitlist entry never holds a seat. An organizer turns one into a real
 * chance by inviting the person: that mints a single-use token (only its
 * SHA-256 hash is stored), sends a localized invitation and opens a time-boxed
 * window in which the database trigger lets that email past the capacity
 * check. When the window lapses the entry is expired and the place returns to
 * the list.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath, type Locale } from "@/i18n/config";
import { localisedText } from "./tickets";
import { WAITLIST_INVITE_HOURS } from "./waitlist";
import {
  CHAPTER_CONTACT,
  formatLocation,
  formatWhen,
  loadLocalisedEvent,
  normaliseLocale,
  type EventRow,
} from "./event-confirmation.server";

const EVENT_COLUMNS =
  "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id";

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type JoinWaitlistInput = {
  eventId: string;
  tierId: string | null;
  fullName: string;
  email: string;
  locale: Locale;
  note: string | null;
  userId: string | null;
};

export type JoinWaitlistResult =
  | { ok: true; alreadyOn: boolean }
  | { ok: false; reason: "closed" | "invalid" | "error" };

/**
 * Records a waitlist request. Idempotent per (event, tier, email): asking
 * twice is a no-op rather than a second place in the queue.
 */
export async function joinWaitlist(input: JoinWaitlistInput): Promise<JoinWaitlistResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) || fullName.length < 2) {
    return { ok: false, reason: "invalid" };
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, status, registration_mode, registration_closes_at, starts_at, ends_at")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event || event.status !== "published" || event.registration_mode === "none") {
    return { ok: false, reason: "closed" };
  }
  const closesAt = event.registration_closes_at ?? event.ends_at ?? event.starts_at;
  if (closesAt && new Date(closesAt).getTime() < Date.now()) {
    return { ok: false, reason: "closed" };
  }

  const existing = await supabaseAdmin
    .from("event_waitlist_entries")
    .select("id, status")
    .eq("event_id", input.eventId)
    .eq("email", email)
    .in("status", ["waiting", "invited"]);
  const match = (existing.data ?? []).length > 0;
  if (match) return { ok: true, alreadyOn: true };

  const { error } = await supabaseAdmin.from("event_waitlist_entries").insert({
    event_id: input.eventId,
    tier_id: input.tierId,
    user_id: input.userId,
    full_name: fullName,
    email,
    locale: input.locale,
    note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
    status: "waiting",
  });
  if (error) {
    console.error("Waitlist join failed", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true, alreadyOn: false };
}

/** Marks lapsed invitations expired so the places return to the queue. */
export async function expireLapsedInvites(eventId: string) {
  await supabaseAdmin
    .from("event_waitlist_entries")
    .update({ status: "expired", invite_token_hash: null })
    .eq("event_id", eventId)
    .eq("status", "invited")
    .lt("invite_expires_at", new Date().toISOString());
}

export type InviteResult = { ok: true } | { ok: false; reason: string };

/**
 * Invites one waiting person. The token lives only in the email; the row keeps
 * its hash, so a database read cannot be replayed as an invitation.
 */
export async function inviteWaitlistEntry(
  entryId: string,
  hours = WAITLIST_INVITE_HOURS,
): Promise<InviteResult> {
  const { data: entry } = await supabaseAdmin
    .from("event_waitlist_entries")
    .select("id, event_id, tier_id, full_name, email, locale, status")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) return { ok: false, reason: "not_found" };
  if (entry.status === "converted" || entry.status === "withdrawn") {
    return { ok: false, reason: "closed" };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + hours * 3_600_000);

  const { error } = await supabaseAdmin
    .from("event_waitlist_entries")
    .update({
      status: "invited",
      invite_token_hash: hashInviteToken(token),
      invited_at: new Date().toISOString(),
      invite_expires_at: expiresAt.toISOString(),
    })
    .eq("id", entryId);
  if (error) return { ok: false, reason: error.message };

  try {
    await sendWaitlistInvitation(entry.event_id, {
      entryId,
      tierId: entry.tier_id,
      fullName: entry.full_name,
      email: entry.email,
      locale: normaliseLocale(entry.locale),
      token,
      expiresAt,
    });
  } catch (e) {
    // The invitation window is already open; a mail problem must not silently
    // strand the place, so it is surfaced to staff who can re-invite.
    console.error("Waitlist invitation email failed", e);
    return { ok: false, reason: "email" };
  }
  return { ok: true };
}

async function sendWaitlistInvitation(
  eventId: string,
  invite: {
    entryId: string;
    tierId: string | null;
    fullName: string;
    email: string;
    locale: Locale;
    token: string;
    expiresAt: Date;
  },
) {
  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!eventRow) throw new Error("Event not found");

  const locale = invite.locale;
  const content = await loadLocalisedEvent(eventRow, locale);
  const eventPath = localizePath(`/events/${eventRow.slug}`, locale);
  const eventUrl = `${SITE_URL}${eventPath}`;
  const claimUrl = `${eventUrl}?invite=${invite.token}`;

  let tierName: string | null = null;
  if (invite.tierId) {
    const { data: tier } = await supabaseAdmin
      .from("event_ticket_tiers")
      .select("name, name_de, name_fr, name_it")
      .eq("id", invite.tierId)
      .maybeSingle();
    if (tier) {
      tierName = localisedText(tier as unknown as Record<string, string | null>, "name", locale);
    }
  }

  let organiserEmail = CHAPTER_CONTACT;
  if (eventRow.community_id) {
    const { data: community } = await supabaseAdmin
      .from("op_projects")
      .select("public_contact_email")
      .eq("id", eventRow.community_id)
      .maybeSingle();
    organiserEmail = community?.public_contact_email || CHAPTER_CONTACT;
  }

  const deadline = new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: eventRow.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(invite.expiresAt);

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const result = await sendTemplateEmail("event-waitlist-invitation", invite.email, {
    idempotencyKey: `waitlist-invite-${invite.entryId}-${invite.expiresAt.getTime()}`,
    replyTo: organiserEmail,
    templateData: {
      locale,
      attendeeName: invite.fullName,
      eventTitle: content.title,
      when: formatWhen(eventRow, locale),
      location: formatLocation(eventRow, locale),
      eventUrl,
      claimUrl,
      tierName,
      deadline,
      organiserEmail,
    },
  });
  if (!result.sent) throw new Error("recipient_suppressed");
}

export type ResolvedInvite = {
  entryId: string;
  eventId: string;
  tierId: string | null;
  fullName: string;
  email: string;
  expiresAt: string;
};

/** Looks up a live invitation by its raw token, or null when it cannot be used. */
export async function resolveInviteToken(
  eventId: string,
  token: string,
): Promise<ResolvedInvite | null> {
  if (!token || token.length > 128) return null;
  const { data } = await supabaseAdmin
    .from("event_waitlist_entries")
    .select("id, event_id, tier_id, full_name, email, status, invite_expires_at")
    .eq("event_id", eventId)
    .eq("invite_token_hash", hashInviteToken(token))
    .maybeSingle();
  if (!data || data.status !== "invited") return null;
  if (!data.invite_expires_at || new Date(data.invite_expires_at).getTime() <= Date.now()) {
    return null;
  }
  return {
    entryId: data.id,
    eventId: data.event_id,
    tierId: data.tier_id,
    fullName: data.full_name,
    email: data.email,
    expiresAt: data.invite_expires_at,
  };
}

/** Closes the invitation once the seat has actually been taken. */
export async function markInviteConverted(entryId: string, registrationId: string) {
  await supabaseAdmin
    .from("event_waitlist_entries")
    .update({
      status: "converted",
      invite_token_hash: null,
      converted_registration_id: registrationId,
    })
    .eq("id", entryId);
}
