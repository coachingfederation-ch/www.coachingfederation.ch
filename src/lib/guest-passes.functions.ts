/**
 * Guest passes — member-facing server functions.
 *
 * An ACTIVE member viewing an event that offers guest passes may request one
 * comped seat for a non-member guest. Everything that decides whether the
 * request is allowed is re-derived here from the database: the caller's
 * membership, the event's toggle, the guest's one-pass-per-pilot eligibility.
 * The client only supplies the guest's own details.
 *
 * Exports: getMyGuestPassContext, submitGuestPassRequest, listMyGuestPasses.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GuestPassOutcome =
  | "ok"
  | "duplicate"
  | "already_used"
  | "not_member"
  | "event_closed"
  | "not_allowed"
  | "error";

export type GuestPassContext = {
  isMember: boolean;
  inviter: { name: string; email: string; memberNumber: string | null } | null;
  /** A request for this event by this member already exists. */
  alreadyRequested: boolean;
};

export type MyGuestPass = {
  id: string;
  eventTitle: string | null;
  eventSlug: string | null;
  eventStartsAt: string | null;
  guestName: string;
  status: string;
  decisionNote: string | null;
  createdAt: string;
};

const requestSchema = z.object({
  eventId: z.string().uuid(),
  guestFullName: z.string().trim().min(1).max(120),
  guestEmail: z.string().trim().email().max(255),
  guestPhone: z.string().trim().min(1).max(60),
  guestLocation: z.string().trim().min(1).max(120),
  guestPreferredLanguage: z.enum(["en", "de", "fr", "it"]),
  guestCoachingLevel: z.string().trim().min(1).max(160),
  guestProfessionalFocus: z.string().trim().min(1).max(200),
  guestOtherAssociations: z.string().trim().max(200).optional(),
  guestNotes: z.string().trim().max(1000).optional(),
});

/** Whose details prefill the request form, and may this member use it at all. */
export const getMyGuestPassContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<GuestPassContext> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, full_name, first_name, last_name, email, cst_recno, activity_state")
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    if (!member || member.activity_state !== "active") {
      return { isMember: false, inviter: null, alreadyRequested: false };
    }

    const { count } = await supabaseAdmin
      .from("guest_passes")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.eventId)
      .eq("inviting_member_id", member.id);

    const name =
      [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
      (member.full_name ?? "");
    return {
      isMember: true,
      inviter: {
        name,
        email: member.email ?? "",
        memberNumber: member.cst_recno ?? null,
      },
      alreadyRequested: (count ?? 0) > 0,
    };
  });

/** Create the pending request and tell Membership & Engagement about it. */
export const submitGuestPassRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ outcome: GuestPassOutcome; passId?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveMembership } = await import("./tickets.server");
    const { resolveGuestEligibility } = await import("./guest-passes.server");

    if ((await resolveMembership(context.userId)) !== "member") return { outcome: "not_member" };

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, title, starts_at, guest_passes_allowed, registration_mode, status")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!event || !event.guest_passes_allowed) return { outcome: "not_allowed" };
    if (event.registration_mode === "none" || event.status !== "published") {
      return { outcome: "event_closed" };
    }

    const email = data.guestEmail.trim().toLowerCase();

    const eligibility = await resolveGuestEligibility(email);
    if (!eligibility.eligible && eligibility.reason !== "pending") {
      return { outcome: "already_used" };
    }

    const { data: existing } = await supabaseAdmin
      .from("guest_passes")
      .select("id")
      .eq("event_id", data.eventId)
      .ilike("guest_email", email)
      .maybeSingle();
    if (existing) return { outcome: "duplicate" };

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, full_name, first_name, last_name, email, cst_recno, activity_state")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!member) return { outcome: "not_member" };
    const inviterName =
      [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
      (member.full_name ?? "");

    const { data: inserted, error } = await supabaseAdmin
      .from("guest_passes")
      .insert({
        event_id: data.eventId,
        inviting_member_id: member.id,
        inviting_member_name: inviterName,
        inviting_member_email: member.email,
        inviting_member_cst_recno: member.cst_recno,
        inviting_member_status: member.activity_state,
        guest_full_name: data.guestFullName,
        guest_email: email,
        guest_phone: data.guestPhone,
        guest_location: data.guestLocation,
        guest_preferred_language: data.guestPreferredLanguage,
        guest_coaching_level: data.guestCoachingLevel,
        guest_professional_focus: data.guestProfessionalFocus,
        guest_other_associations: data.guestOtherAssociations ?? null,
        guest_notes: data.guestNotes ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      const message = error?.message ?? "";
      console.error("[guest-pass] insert failed", message);
      if (/already used a guest pass/i.test(message)) return { outcome: "already_used" };
      if (/already has a request/i.test(message)) return { outcome: "duplicate" };
      if (/does not offer guest passes/i.test(message)) return { outcome: "not_allowed" };
      if (/does not take registrations/i.test(message)) return { outcome: "event_closed" };
      if (/not an active member/i.test(message)) return { outcome: "not_member" };
      return { outcome: "error" };
    }

    // A delivery failure must never lose the request — the row is the record.
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("guest-pass-request", "", {
        idempotencyKey: `guest-pass-request-${inserted.id}`,
        templateData: {
          invitingMemberName: inviterName,
          invitingMemberEmail: member.email ?? "",
          guestName: data.guestFullName,
          guestEmail: email,
          eventTitle: event.title ?? "",
          eventStartsAt: event.starts_at ?? null,
        },
      });
    } catch (err) {
      console.error("[guest-pass] notification email failed", err);
    }

    return { outcome: "ok", passId: inserted.id };
  });

/** The signed-in member's own guest pass requests, newest first. */
export const listMyGuestPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyGuestPass[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listGuestPassesForMember } = await import("./guest-passes.server");

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!member) return [];

    const rows = await listGuestPassesForMember(member.id);
    return rows.map((r) => ({
      id: r.id,
      eventTitle: r.eventTitle,
      eventSlug: r.eventSlug,
      eventStartsAt: r.eventStartsAt,
      guestName: r.guestFullName,
      status: r.status,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt,
    }));
  });
