/**
 * Guest passes — server-side read model.
 *
 * A guest pass is a comped seat that an ACTIVE member requests for a
 * non-member guest on an event whose organizer switched `guest_passes_allowed`
 * on. Membership & Engagement (the `membership` role, plus the two admin
 * levels) decides. The database owns every rule that matters: the
 * `tg_guest_pass_guard` trigger refuses an ineligible inviter, a closed event
 * or a guest who already used a pass, and RLS decides who may read which rows.
 *
 * This module only reads. It uses the admin client because eligibility has to
 * be answerable for a guest email that belongs to nobody signed in, and
 * because the staff lists deliberately cross member boundaries; every caller
 * must have authorised itself first (`assertRole(context, "membership")` or an
 * admin guard) before calling in here.
 *
 * `.server.ts` so it can never be reached from the browser bundle.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Statuses that consume the guest's one pilot pass. */
const USED_STATUSES = ["approved", "registered", "attended"] as const;

export type GuestPassStatus =
  | "pending"
  | "approved"
  | "declined"
  | "registered"
  | "cancelled"
  | "attended"
  | "invited";

export type GuestPassRow = {
  id: string;
  eventId: string;
  eventTitle: string | null;
  eventSlug: string | null;
  eventStartsAt: string | null;
  invitingMemberId: string | null;
  invitingMemberName: string | null;
  invitingMemberEmail: string | null;
  guestFullName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestLocation: string | null;
  guestPreferredLanguage: string | null;
  guestCoachingLevel: string | null;
  guestProfessionalFocus: string | null;
  guestOtherAssociations: string | null;
  guestNotes: string | null;
  status: GuestPassStatus;
  decisionAt: string | null;
  decisionNote: string | null;
  registrationId: string | null;
  followUpStatus: string;
  followUpNote: string | null;
  createdAt: string;
};

const SELECT = `
  id, event_id, inviting_member_id, inviting_member_name, inviting_member_email,
  guest_full_name, guest_email, guest_phone, guest_location, guest_preferred_language,
  guest_coaching_level, guest_professional_focus, guest_other_associations, guest_notes,
  status, decision_at, decision_note, registration_id, follow_up_status, follow_up_note,
  created_at, events ( title, slug, starts_at )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(r: any): GuestPassRow {
  const event = (Array.isArray(r.events) ? r.events[0] : r.events) ?? null;
  return {
    id: r.id,
    eventId: r.event_id,
    eventTitle: event?.title ?? null,
    eventSlug: event?.slug ?? null,
    eventStartsAt: event?.starts_at ?? null,
    invitingMemberId: r.inviting_member_id ?? null,
    invitingMemberName: r.inviting_member_name ?? null,
    invitingMemberEmail: r.inviting_member_email ?? null,
    guestFullName: r.guest_full_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone ?? null,
    guestLocation: r.guest_location ?? null,
    guestPreferredLanguage: r.guest_preferred_language ?? null,
    guestCoachingLevel: r.guest_coaching_level ?? null,
    guestProfessionalFocus: r.guest_professional_focus ?? null,
    guestOtherAssociations: r.guest_other_associations ?? null,
    guestNotes: r.guest_notes ?? null,
    status: r.status as GuestPassStatus,
    decisionAt: r.decision_at ?? null,
    decisionNote: r.decision_note ?? null,
    registrationId: r.registration_id ?? null,
    followUpStatus: r.follow_up_status ?? "none",
    followUpNote: r.follow_up_note ?? null,
    createdAt: r.created_at,
  };
}

export type GuestEligibility = {
  eligible: boolean;
  /** `used` — the guest already had a pass; `member` — the address belongs to a member. */
  reason: "ok" | "used" | "member" | "pending";
  existingPassId: string | null;
};

/**
 * Whether a guest email may still receive a pass. One pass per guest per 12
 * months: a spent pass closes the door until the retention job deletes the row
 * (12 months after that event), and an address that already belongs to an
 * imported member is not a guest at all. A pass that is only `invited` or
 * `pending` has not been granted, so it does not spend the allowance — but the
 * same address cannot be invited twice at once either.
 */
export async function resolveGuestEligibility(guestEmail: string): Promise<GuestEligibility> {
  const email = guestEmail.trim().toLowerCase();
  if (!email) return { eligible: false, reason: "used", existingPassId: null };

  const [{ data: passes }, { data: member }] = await Promise.all([
    supabaseAdmin
      .from("guest_passes")
      .select("id, status, events ( starts_at, ends_at )")
      .ilike("guest_email", email)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("members").select("id").ilike("email", email).maybeSingle(),
  ]);

  if (member) return { eligible: false, reason: "member", existingPassId: null };

  const cutoff = new Date(Date.now() - GUEST_PASS_RETENTION_DAYS * 86_400_000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (passes ?? []) as any[];

  const used = rows.find((r) => {
    if (!(USED_STATUSES as readonly string[]).includes(r.status)) return false;
    const event = (Array.isArray(r.events) ? r.events[0] : r.events) ?? null;
    const when: string | null = event?.ends_at ?? event?.starts_at ?? null;
    // A pass whose event is older than the retention window is on borrowed
    // time; the daily purge will remove it, so it no longer blocks.
    return !when || when >= cutoff;
  });
  if (used) return { eligible: false, reason: "used", existingPassId: used.id };

  const open = rows.find((r) => r.status === "pending" || r.status === "invited");
  if (open) return { eligible: false, reason: "pending", existingPassId: open.id };

  return { eligible: true, reason: "ok", existingPassId: null };
}


/** Every pass one member has invited, newest first. */
export async function listGuestPassesForMember(memberId: string): Promise<GuestPassRow[]> {
  const { data, error } = await supabaseAdmin
    .from("guest_passes")
    .select(SELECT)
    .eq("inviting_member_id", memberId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRow);
}

/** Every pass requested for one event, newest first. */
export async function listGuestPassesForEvent(eventId: string): Promise<GuestPassRow[]> {
  const { data, error } = await supabaseAdmin
    .from("guest_passes")
    .select(SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRow);
}

/** Every pass in the pilot, newest first. Membership & Engagement view. */
export async function listAllGuestPasses(): Promise<GuestPassRow[]> {
  const { data, error } = await supabaseAdmin
    .from("guest_passes")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRow);
}

/**
 * The comped seat behind an approved pass.
 *
 * Written with the trusted client on purpose: Membership & Engagement decides
 * chapter-wide and is not necessarily an organizer of this event, so the
 * caller's own RLS-scoped client would refuse the insert. Every caller has
 * already passed `assertMembership`.
 *
 * Idempotent in both halves: a pass that already carries a `registration_id`
 * is left alone, and the confirmation email is claimed before it is sent, so a
 * double click can never produce a second seat or a second ticket.
 */
export async function createGuestRegistration(
  passId: string,
  actorUserId: string,
): Promise<{ outcome: "created" | "exists" | "ineligible"; registrationId?: string }> {
  const { data: pass } = await supabaseAdmin
    .from("guest_passes")
    .select(
      "id, event_id, guest_email, guest_full_name, guest_preferred_language, status, registration_id",
    )
    .eq("id", passId)
    .maybeSingle();
  if (!pass) return { outcome: "ineligible" };
  if (pass.registration_id) {
    return { outcome: "exists", registrationId: pass.registration_id as string };
  }
  if (pass.status !== "approved") return { outcome: "ineligible" };

  const email = String(pass.guest_email).trim().toLowerCase();

  // A seat may already exist from a staff-added attendee with the same
  // address; adopt it rather than double-booking the guest.
  const { data: existing } = await supabaseAdmin
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", pass.event_id)
    .eq("email", email)
    .maybeSingle();

  let registrationId = existing?.status === "confirmed" ? (existing.id as string) : null;

  if (!registrationId) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, registration_mode, tickets_enabled")
      .eq("id", pass.event_id)
      .maybeSingle();
    if (!event) return { outcome: "ineligible" };

    // Only a genuinely free tier may be attached; otherwise the seat carries
    // no tier at all, so nothing can price it later.
    let tierId: string | null = null;
    if (event.tickets_enabled) {
      const { data: freeTier } = await supabaseAdmin
        .from("event_ticket_tiers")
        .select("id")
        .eq("event_id", pass.event_id)
        .eq("is_active", true)
        .eq("price_cents", 0)
        .limit(1)
        .maybeSingle();
      tierId = (freeTier?.id as string | undefined) ?? null;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("event_registrations")
      .insert({
        event_id: pass.event_id,
        tier_id: tierId,
        full_name: pass.guest_full_name,
        email,
        locale: pass.guest_preferred_language ?? "en",
        status: "confirmed",
        payment_status: "not_required",
        amount_cents: 0,
        notes: "Guest Pass",
        created_by_staff: actorUserId,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("[guest-pass] comped registration failed", error?.message);
      return { outcome: "ineligible" };
    }
    registrationId = inserted.id as string;
  }

  // Claim the pass first: whoever wins this update owns the email send.
  const { data: claimed } = await supabaseAdmin
    .from("guest_passes")
    .update({ registration_id: registrationId, status: "registered" })
    .eq("id", passId)
    .is("registration_id", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    return { outcome: "exists", registrationId };
  }

  try {
    const { sendRegistrationConfirmation } = await import("./event-confirmation.server");
    await sendRegistrationConfirmation(registrationId, { force: true });
  } catch (err) {
    // The seat is the record; a delivery failure is logged on the registration
    // row by the sender itself and must never fail the approval.
    console.error("[guest-pass] ticket email failed", err);
  }

  return { outcome: "created", registrationId };
}

/* ---------------------------------------------------------------------------
 * The guest's own claim link
 *
 * The member only names a guest; the guest completes their own profile behind
 * a single-use token. Only the SHA-256 hash of that token is ever stored, so a
 * database read cannot reconstruct a working link — the same rule the event
 * invitations follow.
 * ------------------------------------------------------------------------- */

/** Version stamped on a completed profile, so we know which notice was shown. */
export const GUEST_PASS_PRIVACY_NOTICE_VERSION = "guest-pass-2026-08";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Writes a fresh invitation token and returns the RAW token, for the email only. */
export async function mintGuestPassInviteToken(passId: string): Promise<string | null> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin
    .from("guest_passes")
    .update({ invite_token_hash: hashToken(token), invited_at: new Date().toISOString() })
    .eq("id", passId);
  if (error) {
    console.error("[guest-pass] token mint failed", error.message);
    return null;
  }
  return token;
}

export type GuestPassClaim = {
  passId: string;
  eventId: string;
  eventTitle: string | null;
  eventStartsAt: string | null;
  eventSlug: string | null;
  invitingMemberName: string | null;
  guestFullName: string;
  guestEmail: string;
};

/**
 * The claim page's read-only facts. Deliberately narrow: no phone, no coaching
 * fields, no member number, no member email — a leaked link must not expose
 * more than the guest already knows.
 */
export async function resolveGuestPassToken(token: string): Promise<GuestPassClaim | null> {
  const clean = token.trim();
  if (!clean) return null;
  const { data } = await supabaseAdmin
    .from("guest_passes")
    .select(
      "id, event_id, status, inviting_member_name, guest_full_name, guest_email, events ( title, slug, starts_at )",
    )
    .eq("invite_token_hash", hashToken(clean))
    .maybeSingle();
  if (!data || data.status !== "invited") return null;
  const event = (Array.isArray(data.events) ? data.events[0] : data.events) as
    | { title?: string | null; slug?: string | null; starts_at?: string | null }
    | null
    | undefined;
  return {
    passId: data.id as string,
    eventId: data.event_id as string,
    eventTitle: event?.title ?? null,
    eventStartsAt: event?.starts_at ?? null,
    eventSlug: event?.slug ?? null,
    invitingMemberName: (data.inviting_member_name as string | null) ?? null,
    guestFullName: data.guest_full_name as string,
    guestEmail: data.guest_email as string,
  };
}

export type GuestProfileFields = {
  guestPreferredLanguage: "en" | "de" | "fr" | "it";
  guestPhone?: string | null;
  guestLocation?: string | null;
  guestCoachingLevel?: string | null;
  guestProfessionalFocus?: string | null;
  guestOtherAssociations?: string | null;
  guestNotes?: string | null;
  followUpConsent: boolean;
};

export type CompleteProfileResult =
  | { ok: true; passId: string }
  | { ok: false; reason: "invalid" | "already_completed" | "error" };

/**
 * The guest's one write. Trusted client on purpose: the guest holds a token,
 * not a session, and the guard trigger only lets the server path move a row
 * out of `invited`. The token is nulled out in the same update, so the link is
 * single use and a re-open lands on the stable "already completed" state.
 */
export async function completeGuestPassProfile(
  token: string,
  fields: GuestProfileFields,
): Promise<CompleteProfileResult> {
  const clean = token.trim();
  if (!clean) return { ok: false, reason: "invalid" };
  const tokenHash = hashToken(clean);

  const { data: row } = await supabaseAdmin
    .from("guest_passes")
    .select("id, status")
    .eq("invite_token_hash", tokenHash)
    .maybeSingle();

  if (!row) return { ok: false, reason: "already_completed" };
  if (row.status !== "invited") return { ok: false, reason: "already_completed" };

  const now = new Date().toISOString();
  const { data: updated, error } = await supabaseAdmin
    .from("guest_passes")
    .update({
      status: "pending",
      guest_preferred_language: fields.guestPreferredLanguage,
      guest_phone: fields.guestPhone || null,
      guest_location: fields.guestLocation || null,
      guest_coaching_level: fields.guestCoachingLevel || null,
      guest_professional_focus: fields.guestProfessionalFocus || null,
      guest_other_associations: fields.guestOtherAssociations || null,
      guest_notes: fields.guestNotes || null,
      follow_up_consent: fields.followUpConsent,
      follow_up_consent_at: fields.followUpConsent ? now : null,
      privacy_notice_version: GUEST_PASS_PRIVACY_NOTICE_VERSION,
      guest_completed_at: now,
      invite_token_hash: null,
    })
    .eq("id", row.id)
    .eq("status", "invited")
    .select("id");

  if (error) {
    console.error("[guest-pass] profile completion failed", error.message);
    return { ok: false, reason: "error" };
  }
  if (!updated || updated.length === 0) return { ok: false, reason: "already_completed" };
  return { ok: true, passId: row.id as string };
}

/* ---------------------------------------------------------------------------
 * Retention
 *
 * Guest Pass records live for the same 12 months the privacy policy promises
 * for event registration — but here the promise is kept by a daily job, not by
 * hand. After the delete the address is invitable again: the row itself is the
 * one-pass-per-guest record, so there is no hashed email list to keep.
 * ------------------------------------------------------------------------- */

export const GUEST_PASS_RETENTION_DAYS = 365;

export async function purgeExpiredGuestPasses(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - GUEST_PASS_RETENTION_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("guest_passes")
    .select("id, registration_id, events!inner ( starts_at, ends_at )");
  if (error) throw new Error(error.message);

  const expired = (data ?? []).filter((row) => {
    const event = (Array.isArray(row.events) ? row.events[0] : row.events) as
      | { starts_at?: string | null; ends_at?: string | null }
      | null
      | undefined;
    const when = event?.ends_at ?? event?.starts_at ?? null;
    return Boolean(when) && (when as string) < cutoff;
  });
  if (expired.length === 0) return { deleted: 0 };

  // The comped seat carries the guest's name and address too. Anonymise it
  // rather than delete it: the attendance history stays, the person does not.
  // `notes = 'Guest Pass'` is the provenance `createGuestRegistration` writes,
  // so no ordinary attendee can be caught by this.
  const registrationIds = expired
    .map((row) => row.registration_id as string | null)
    .filter((id): id is string => Boolean(id));

  for (const registrationId of registrationIds) {
    const { error: anonError } = await supabaseAdmin
      .from("event_registrations")
      .update({
        full_name: "Guest",
        email: `deleted+${registrationId}@invalid.local`,
        notes: null,
        answers: {},
      })
      .eq("id", registrationId)
      .eq("notes", "Guest Pass");
    if (anonError) console.error("[guest-pass-purge] anonymise failed", anonError.message);
  }

  const { data: deleted, error: deleteError } = await supabaseAdmin
    .from("guest_passes")
    .delete()
    .in(
      "id",
      expired.map((row) => row.id as string),
    )
    .select("id");
  if (deleteError) throw new Error(deleteError.message);

  return { deleted: (deleted ?? []).length };
}
