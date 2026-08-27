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
