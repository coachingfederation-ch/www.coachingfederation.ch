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
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Statuses that consume the guest's one pilot pass. */
const USED_STATUSES = ["approved", "registered", "attended"] as const;

export type GuestPassStatus =
  | "pending"
  | "approved"
  | "declined"
  | "registered"
  | "cancelled"
  | "attended";

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
 * Whether a guest email may still receive a pass. The pilot rule is one pass
 * per guest in total, so a spent pass on ANY event closes the door — and an
 * address that already belongs to an imported member is not a guest at all.
 */
export async function resolveGuestEligibility(guestEmail: string): Promise<GuestEligibility> {
  const email = guestEmail.trim().toLowerCase();
  if (!email) return { eligible: false, reason: "used", existingPassId: null };

  const [{ data: passes }, { data: member }] = await Promise.all([
    supabaseAdmin
      .from("guest_passes")
      .select("id, status")
      .ilike("guest_email", email)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("members").select("id").ilike("email", email).maybeSingle(),
  ]);

  if (member) return { eligible: false, reason: "member", existingPassId: null };

  const rows = (passes ?? []) as { id: string; status: GuestPassStatus }[];
  const used = rows.find((r) => (USED_STATUSES as readonly string[]).includes(r.status));
  if (used) return { eligible: false, reason: "used", existingPassId: used.id };

  const pending = rows.find((r) => r.status === "pending");
  if (pending) return { eligible: false, reason: "pending", existingPassId: pending.id };

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
      .select("id, registration_mode")
      .eq("id", pass.event_id)
      .maybeSingle();
    if (!event) return { outcome: "ineligible" };

    // Only a genuinely free tier may be attached; otherwise the seat carries
    // no tier at all, so nothing can price it later.
    let tierId: string | null = null;
    if (event.registration_mode === "rsvp_tickets") {
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
