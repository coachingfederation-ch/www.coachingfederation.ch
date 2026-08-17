/**
 * Invitation-only events — server-only logic.
 *
 * On an `rsvp_invited` event the guest list comes first: staff pick active
 * members, each one gets a personal link carrying a single-use token (only its
 * SHA-256 hash is stored) and nobody else can register. The token is resolved
 * here and the email always comes from the invitation, never from the form, so
 * a forwarded link cannot seat somebody else.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath, type Locale } from "@/i18n/config";
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

export type InvitationStatus = "invited" | "registered" | "declined" | "revoked" | "expired";

export type InvitationRow = {
  id: string;
  event_id: string;
  member_id: string | null;
  full_name: string;
  email: string;
  locale: string;
  status: InvitationStatus;
  invited_at: string | null;
  responded_at: string | null;
  created_at: string;
};

export type InvitableMember = {
  memberId: string;
  name: string;
  email: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function displayName(row: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const full = (row.full_name ?? "").trim();
  if (full) return full;
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
}

/**
 * Active members who could still be invited to this event. Listing other
 * accounts is exactly what member RLS forbids, so the read is admin-side; the
 * calling server function has already proved the caller manages the event.
 */
export async function listInvitableMembers(
  eventId: string,
  query: string,
  limit = 20,
): Promise<InvitableMember[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  let request = supabaseAdmin
    .from("members")
    .select("id, full_name, first_name, last_name, email, activity_state")
    .eq("activity_state", "active")
    .not("email", "is", null)
    .order("last_name", { ascending: true })
    .limit(limit * 3);
  const like = `%${term.replace(/[%_]/g, "")}%`;
  request = request.or(
    `full_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`,
  );

  const { data, error } = await request;
  if (error) throw new Error(error.message);

  const { data: already } = await supabaseAdmin
    .from("event_invitations")
    .select("email")
    .eq("event_id", eventId);
  const taken = new Set((already ?? []).map((row) => String(row.email).toLowerCase()));

  return (data ?? [])
    .map((row) => ({
      memberId: row.id as string,
      name: displayName(row) || String(row.email),
      email: String(row.email).trim().toLowerCase(),
    }))
    .filter((row) => !taken.has(row.email))
    .slice(0, limit);
}

/** The whole guest list for one event, in the order people were added. */
export async function listInvitations(eventId: string): Promise<InvitationRow[]> {
  const { data, error } = await supabaseAdmin
    .from("event_invitations")
    .select(
      "id, event_id, member_id, full_name, email, locale, status, invited_at, responded_at, created_at",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as InvitationRow[];
}

export type AddResult = { ok: true } | { ok: false; reason: "duplicate" | "email" | "error" };

/** Adds one member to the guest list and sends their personal invitation. */
export async function addInvitation(
  eventId: string,
  memberId: string,
  actorUserId: string,
): Promise<AddResult> {
  const { data: member } = await supabaseAdmin
    .from("members")
    .select("id, auth_user_id, full_name, first_name, last_name, email, activity_state")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.activity_state !== "active" || !member.email) {
    return { ok: false, reason: "error" };
  }

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("language")
    .eq("id", eventId)
    .maybeSingle();
  const locale = normaliseLocale(eventRow?.language ?? "en");

  const token = randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  const { error } = await supabaseAdmin.from("event_invitations").insert({
    id,
    event_id: eventId,
    member_id: member.id as string,
    user_id: (member.auth_user_id as string | null) ?? null,
    full_name: displayName(member) || String(member.email),
    email: String(member.email).trim().toLowerCase(),
    locale,
    status: "invited",
    invite_token_hash: hashToken(token),
    invited_at: new Date().toISOString(),
    invited_by: actorUserId,
  });
  if (error) {
    return { ok: false, reason: error.code === "23505" ? "duplicate" : "error" };
  }

  try {
    await sendInvitationEmail(id, token);
  } catch (e) {
    console.error("Event invitation email failed", e);
    return { ok: false, reason: "email" };
  }
  return { ok: true };
}

/** Mints a fresh token — the previous link stops working — and mails it again. */
export async function resendInvitation(invitationId: string): Promise<AddResult> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin
    .from("event_invitations")
    .update({
      status: "invited",
      invite_token_hash: hashToken(token),
      invited_at: new Date().toISOString(),
      responded_at: null,
    })
    .eq("id", invitationId);
  if (error) return { ok: false, reason: "error" };
  try {
    await sendInvitationEmail(invitationId, token);
  } catch (e) {
    console.error("Event invitation email failed", e);
    return { ok: false, reason: "email" };
  }
  return { ok: true };
}

async function sendInvitationEmail(invitationId: string, token: string) {
  const { data: invitation } = await supabaseAdmin
    .from("event_invitations")
    .select("id, event_id, full_name, email, locale")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation) throw new Error("Invitation not found");

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", invitation.event_id)
    .maybeSingle<EventRow>();
  if (!eventRow) throw new Error("Event not found");

  const locale: Locale = normaliseLocale(invitation.locale);
  const content = await loadLocalisedEvent(eventRow, locale);
  const eventUrl = `${SITE_URL}${localizePath(`/events/${eventRow.slug}`, locale)}`;
  const claimUrl = `${eventUrl}?invite=${token}`;

  let organiserEmail = CHAPTER_CONTACT;
  if (eventRow.community_id) {
    const { data: community } = await supabaseAdmin
      .from("op_projects")
      .select("public_contact_email")
      .eq("id", eventRow.community_id)
      .maybeSingle();
    organiserEmail = community?.public_contact_email || CHAPTER_CONTACT;
  }

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const result = await sendTemplateEmail("event-invitation", invitation.email as string, {
    idempotencyKey: `event-invitation-${invitationId}-${hashToken(token).slice(0, 12)}`,
    replyTo: organiserEmail,
    templateData: {
      locale,
      attendeeName: invitation.full_name,
      eventTitle: content.title,
      when: formatWhen(eventRow, locale),
      location: formatLocation(eventRow, locale),
      eventUrl,
      claimUrl,
      organiserEmail,
    },
  });
  if (!result.sent) throw new Error("recipient_suppressed");
}

export type ResolvedInvitation = {
  invitationId: string;
  eventId: string;
  fullName: string;
  email: string;
};

/** Looks up a usable invitation by its raw token, or null when it cannot be used. */
export async function resolveInvitationToken(
  eventId: string,
  token: string,
): Promise<ResolvedInvitation | null> {
  if (!token || token.length > 128) return null;
  const { data } = await supabaseAdmin
    .from("event_invitations")
    .select("id, event_id, full_name, email, status")
    .eq("event_id", eventId)
    .eq("invite_token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.status !== "invited") return null;
  return {
    invitationId: data.id as string,
    eventId: data.event_id as string,
    fullName: data.full_name as string,
    email: data.email as string,
  };
}

/** Closes the invitation once the place has actually been taken. */
export async function markInvitationRegistered(invitationId: string, registrationId: string) {
  await supabaseAdmin
    .from("event_invitations")
    .update({
      status: "registered",
      invite_token_hash: null,
      responded_at: new Date().toISOString(),
      registration_id: registrationId,
    })
    .eq("id", invitationId);
}

/** "I can't make it" from the invitation link. */
export async function declineInvitation(eventId: string, token: string) {
  const invitation = await resolveInvitationToken(eventId, token);
  if (!invitation) return { ok: false as const };
  await supabaseAdmin
    .from("event_invitations")
    .update({
      status: "declined",
      invite_token_hash: null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitation.invitationId);
  return { ok: true as const };
}
