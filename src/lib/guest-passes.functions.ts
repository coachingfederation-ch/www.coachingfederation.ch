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

/**
 * The member names a guest — nothing more. Everything personal about the guest
 * is collected from the guest, on their own claim page, after they have read
 * the privacy notice. `attested` is the member confirming they told the guest
 * their name and email would be shared so we can invite them.
 */
const requestSchema = z.object({
  eventId: z.string().uuid(),
  guestFullName: z.string().trim().min(1).max(120),
  guestEmail: z.string().trim().email().max(255),
  attested: z.literal(true),
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
      .select("id, title, starts_at, language, guest_passes_allowed, registration_mode, status")
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
        // The guest fills these in themselves, behind their own link.
        guest_phone: null,
        guest_location: null,
        guest_preferred_language: null,
        guest_coaching_level: null,
        guest_professional_focus: null,
        guest_other_associations: null,
        guest_notes: null,
        status: "invited",
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

    // Membership & Engagement is told once the guest has completed the form,
    // not now: there is nothing to decide on yet.
    // A delivery failure must never lose the request — the row is the record.
    try {
      const { mintGuestPassInviteToken } = await import("./guest-passes.server");
      const { SITE_URL, localizePath } = await import("@/i18n/config");
      const { sendTemplateEmail } = await import("./email-templates/send-email");

      const rawToken = await mintGuestPassInviteToken(inserted.id);
      const locale = (["en", "de", "fr", "it"] as const).includes(
        (event.language ?? "en") as "en" | "de" | "fr" | "it",
      )
        ? ((event.language ?? "en") as "en" | "de" | "fr" | "it")
        : "en";

      if (rawToken) {
        await sendTemplateEmail("guest-pass-invite", email, {
          idempotencyKey: `guest-pass-invite-${inserted.id}`,
          replyTo: "office@coachingfederation.ch",
          templateData: {
            locale,
            guestName: data.guestFullName,
            invitingMemberName: inviterName,
            eventTitle: event.title ?? "",
            eventStartsAt: event.starts_at ?? null,
            claimUrl: `${SITE_URL}${localizePath(`/guest-pass/${rawToken}`, locale)}`,
          },
        });
      }
    } catch (err) {
      console.error("[guest-pass] guest invitation email failed", err);
    }

    // The inviter gets a confirmation — never with the guest's token in it: a
    // forwarded member mail must not let somebody else complete the profile.
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      if (member.email) {
        await sendTemplateEmail("guest-pass-member-invited", member.email, {
          idempotencyKey: `guest-pass-member-invited-${inserted.id}`,
          templateData: {
            stage: "invited",
            invitingMemberName: inviterName,
            guestName: data.guestFullName,
            guestEmail: email,
            eventTitle: event.title ?? "",
            eventStartsAt: event.starts_at ?? null,
          },
        });
      }
    } catch (err) {
      console.error("[guest-pass] inviter confirmation email failed", err);
    }

    return { outcome: "ok", passId: inserted.id };
  });

/* ---------------------------------------------------------------------------
 * The guest's own claim page (/guest-pass/$token)
 *
 * No session: the token is the credential, so both functions are deliberately
 * unauthenticated and rate-limited per caller. They never accept a pass id.
 * ------------------------------------------------------------------------- */

export type GuestPassClaimView = {
  eventTitle: string | null;
  eventStartsAt: string | null;
  invitingMemberName: string | null;
  guestFullName: string;
  guestEmail: string;
};

export const getGuestPassClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(10).max(200) }).parse(input))
  .handler(async ({ data }): Promise<GuestPassClaimView | null> => {
    const { resolveGuestPassToken } = await import("./guest-passes.server");
    const claim = await resolveGuestPassToken(data.token);
    if (!claim) return null;
    return {
      eventTitle: claim.eventTitle,
      eventStartsAt: claim.eventStartsAt,
      invitingMemberName: claim.invitingMemberName,
      guestFullName: claim.guestFullName,
      guestEmail: claim.guestEmail,
    };
  });

const completeSchema = z.object({
  token: z.string().min(10).max(200),
  guestPreferredLanguage: z.enum(["en", "de", "fr", "it"]),
  guestPhone: z.string().trim().max(60).optional(),
  guestLocation: z.string().trim().max(120).optional(),
  guestCoachingLevel: z.string().trim().max(160).optional(),
  guestProfessionalFocus: z.string().trim().max(200).optional(),
  guestOtherAssociations: z.string().trim().max(200).optional(),
  guestNotes: z.string().trim().max(1000).optional(),
  followUpConsent: z.boolean(),
});

export const completeGuestPassClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => completeSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      ok: boolean;
      reason?: "invalid" | "already_completed" | "rate_limited" | "error";
    }> => {
      const { clientIp, checkRateLimit } = await import("./rate-limit.server");
      const { getRequest } = await import("@tanstack/react-start/server");
      const verdict = await checkRateLimit("guest-pass-claim", `ip:${clientIp(getRequest())}`, [
        { windowSeconds: 600, max: 8 },
        { windowSeconds: 86_400, max: 40 },
      ]);
      if (!verdict.allowed) return { ok: false, reason: "rate_limited" };

      const { completeGuestPassProfile } = await import("./guest-passes.server");
      const result = await completeGuestPassProfile(data.token, {
        guestPreferredLanguage: data.guestPreferredLanguage,
        guestPhone: data.guestPhone ?? null,
        guestLocation: data.guestLocation ?? null,
        guestCoachingLevel: data.guestCoachingLevel ?? null,
        guestProfessionalFocus: data.guestProfessionalFocus ?? null,
        guestOtherAssociations: data.guestOtherAssociations ?? null,
        guestNotes: data.guestNotes ?? null,
        followUpConsent: data.followUpConsent,
      });
      if (!result.ok) return { ok: false, reason: result.reason };

      // Only now is there something to decide on: tell the office, and tell
      // the member their guest is through the door of the form.
      try {
        await notifyGuestPassCompleted(result.passId);
      } catch (err) {
        console.error("[guest-pass] completion notifications failed", err);
      }
      return { ok: true };
    },
  );

/** Office review request + inviter update, once the guest has completed. */
async function notifyGuestPassCompleted(passId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("./email-templates/send-email");

  const { data: pass } = await supabaseAdmin
    .from("guest_passes")
    .select(
      "id, guest_full_name, guest_email, inviting_member_name, inviting_member_email, events ( title, starts_at )",
    )
    .eq("id", passId)
    .maybeSingle();
  if (!pass) return;
  const event = (Array.isArray(pass.events) ? pass.events[0] : pass.events) as
    | { title?: string | null; starts_at?: string | null }
    | null
    | undefined;

  const shared = {
    invitingMemberName: pass.inviting_member_name ?? "",
    invitingMemberEmail: pass.inviting_member_email ?? "",
    guestName: pass.guest_full_name,
    guestEmail: pass.guest_email,
    eventTitle: event?.title ?? "",
    eventStartsAt: event?.starts_at ?? null,
  };

  try {
    await sendTemplateEmail("guest-pass-request", "", {
      idempotencyKey: `guest-pass-request-${passId}`,
      templateData: shared,
    });
  } catch (err) {
    console.error("[guest-pass] office review email failed", err);
  }

  if (pass.inviting_member_email) {
    try {
      await sendTemplateEmail("guest-pass-member-invited", pass.inviting_member_email, {
        idempotencyKey: `guest-pass-member-completed-${passId}`,
        templateData: { ...shared, stage: "completed" },
      });
    } catch (err) {
      console.error("[guest-pass] inviter completion email failed", err);
    }
  }
}

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

/* ---------------------------------------------------------------------------
 * Membership & Engagement (M&E)
 *
 * Everything below is gated by `assertMembership`: the M&E grant or either
 * admin level. The decision itself is written through the trusted client
 * because M&E works chapter-wide and is not necessarily an organizer of the
 * event a pass belongs to.
 * ------------------------------------------------------------------------- */

export type StaffGuestPass = {
  id: string;
  eventId: string;
  eventTitle: string | null;
  eventStartsAt: string | null;
  invitingMemberName: string | null;
  invitingMemberEmail: string | null;
  invitingMemberNumber: string | null;
  invitingMemberStatus: string | null;
  guestFullName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestLocation: string | null;
  guestPreferredLanguage: string | null;
  guestCoachingLevel: string | null;
  guestProfessionalFocus: string | null;
  guestOtherAssociations: string | null;
  guestNotes: string | null;
  /** Set when the guest submitted their own details; null while `invited`. */
  guestCompletedAt: string | null;
  /** The guest's own opt-in to community follow-up, and when they gave it. */
  followUpConsent: boolean;
  followUpConsentAt: string | null;
  eventEndsAt: string | null;
  status: string;
  decisionAt: string | null;
  decisionNote: string | null;
  registrationId: string | null;
  checkedInAt: string | null;
  followUpStatus: string;
  followUpNote: string | null;
  convertedMemberId: string | null;
  /** An active member now exists for the guest's address — offer conversion. */
  matchedMemberId: string | null;
  createdAt: string;
};

const FOLLOW_UP = ["none", "contacted", "converted", "closed"] as const;

/** Notify the event's community leader and the inviting member. */
async function notifyApproval(passId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pass } = await supabaseAdmin
    .from("guest_passes")
    .select(
      "id, event_id, guest_full_name, inviting_member_name, inviting_member_email, decision_note",
    )
    .eq("id", passId)
    .maybeSingle();
  if (!pass) return;

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("title, starts_at, community_id")
    .eq("id", pass.event_id)
    .maybeSingle();

  // Same lookup as the invitation mails: the community's public contact, with
  // the chapter office as the fallback.
  let leaderEmail = "office@coachingfederation.ch";
  if (event?.community_id) {
    const { data: community } = await supabaseAdmin
      .from("op_projects")
      .select("public_contact_email")
      .eq("id", event.community_id)
      .maybeSingle();
    leaderEmail = community?.public_contact_email || leaderEmail;
  }

  const templateData = {
    invitingMemberName: pass.inviting_member_name ?? "",
    guestName: pass.guest_full_name,
    eventTitle: event?.title ?? "",
    eventStartsAt: event?.starts_at ?? null,
    decisionNote: pass.decision_note ?? null,
  };

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const recipients = [leaderEmail, pass.inviting_member_email].filter(
    (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index,
  );
  for (const to of recipients) {
    try {
      await sendTemplateEmail("guest-pass-approved", to, {
        idempotencyKey: `guest-pass-approved-${passId}-${to}`,
        templateData,
      });
    } catch (err) {
      console.error("[guest-pass] approval notification failed", err);
    }
  }
}

/** Approve, create the comped seat, email the guest, leader and inviter. */
export const approveGuestPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ passId: z.string().uuid(), note: z.string().trim().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertMembership } = await import("./authz");
    const userId = await assertMembership(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createGuestRegistration } = await import("./guest-passes.server");

    const { data: pass } = await supabaseAdmin
      .from("guest_passes")
      .select("id, status")
      .eq("id", data.passId)
      .maybeSingle();
    if (!pass) throw new Error("Guest pass not found");

    // Idempotent: a second click on an already decided pass changes nothing.
    if (pass.status === "registered" || pass.status === "attended") {
      return { ok: true as const, status: pass.status };
    }
    if (pass.status !== "pending" && pass.status !== "approved") {
      return { ok: false as const, reason: "not_pending" as const };
    }

    if (pass.status === "pending") {
      const { error } = await supabaseAdmin
        .from("guest_passes")
        .update({
          status: "approved",
          decision_by: userId,
          decision_at: new Date().toISOString(),
          decision_note: data.note ?? null,
        })
        .eq("id", data.passId)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
    }

    const result = await createGuestRegistration(data.passId, userId);
    if (result.outcome === "created") await notifyApproval(data.passId);

    return {
      ok: true as const,
      status: result.outcome === "ineligible" ? "approved" : "registered",
    };
  });

/** Decline the request and tell the inviting member. */
export const declineGuestPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ passId: z.string().uuid(), note: z.string().trim().max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertMembership } = await import("./authz");
    const userId = await assertMembership(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pass } = await supabaseAdmin
      .from("guest_passes")
      .select("id, status, guest_full_name, inviting_member_name, inviting_member_email, event_id")
      .eq("id", data.passId)
      .maybeSingle();
    if (!pass) throw new Error("Guest pass not found");
    if (pass.status === "declined") return { ok: true as const };
    if (pass.status !== "pending") return { ok: false as const, reason: "not_pending" as const };

    const { error } = await supabaseAdmin
      .from("guest_passes")
      .update({
        status: "declined",
        decision_by: userId,
        decision_at: new Date().toISOString(),
        decision_note: data.note,
      })
      .eq("id", data.passId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("title")
      .eq("id", pass.event_id)
      .maybeSingle();

    if (pass.inviting_member_email) {
      try {
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        await sendTemplateEmail("guest-pass-declined", pass.inviting_member_email, {
          idempotencyKey: `guest-pass-declined-${data.passId}`,
          templateData: {
            invitingMemberName: pass.inviting_member_name ?? "",
            guestName: pass.guest_full_name,
            eventTitle: event?.title ?? "",
            decisionNote: data.note,
          },
        });
      } catch (err) {
        console.error("[guest-pass] decline notification failed", err);
      }
    }

    return { ok: true as const };
  });

/** Withdraw a pending or approved pass; a comped seat is released with it. */
export const cancelGuestPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ passId: z.string().uuid(), note: z.string().trim().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertMembership } = await import("./authz");
    const userId = await assertMembership(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pass } = await supabaseAdmin
      .from("guest_passes")
      .select("id, status, registration_id")
      .eq("id", data.passId)
      .maybeSingle();
    if (!pass) throw new Error("Guest pass not found");
    if (pass.status === "cancelled") return { ok: true as const };
    if (pass.status === "attended") return { ok: false as const, reason: "attended" as const };

    // The seat is comped, so there is nothing to refund — cancelling the row
    // is what frees the place for someone else.
    if (pass.registration_id) {
      await supabaseAdmin
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("id", pass.registration_id);
    }

    const { error } = await supabaseAdmin
      .from("guest_passes")
      .update({
        status: "cancelled",
        decision_by: userId,
        decision_at: new Date().toISOString(),
        decision_note: data.note ?? null,
      })
      .eq("id", data.passId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

/** Follow-up state after the event, plus the optional link to a new member. */
export const setGuestPassFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        passId: z.string().uuid(),
        followUpStatus: z.enum(FOLLOW_UP),
        followUpNote: z.string().trim().max(1000).optional().nullable(),
        convertedMemberId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("guest_passes")
      .update({
        follow_up_status: data.followUpStatus,
        follow_up_note: data.followUpNote ?? null,
        converted_member_id: data.convertedMemberId ?? null,
      })
      .eq("id", data.passId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Every pass in the pilot, with attendance and conversion resolved. */
export const listAllGuestPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffGuestPass[]> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listAllGuestPasses: readAll } = await import("./guest-passes.server");

    const rows = await readAll();
    if (rows.length === 0) return [];

    const registrationIds = rows.map((r) => r.registrationId).filter((id): id is string => !!id);
    const emails = rows.map((r) => r.guestEmail.toLowerCase());

    const [{ data: registrations }, { data: members }] = await Promise.all([
      registrationIds.length
        ? supabaseAdmin
            .from("event_registrations")
            .select("id, checked_in_at")
            .in("id", registrationIds)
        : Promise.resolve({ data: [] as { id: string; checked_in_at: string | null }[] }),
      supabaseAdmin.from("members").select("id, email, activity_state").in("email", emails),
    ]);

    const checkedIn = new Map(
      ((registrations ?? []) as { id: string; checked_in_at: string | null }[]).map((r) => [
        r.id,
        r.checked_in_at,
      ]),
    );
    // Only an ACTIVE member counts as a conversion; a lapsed record does not.
    const memberByEmail = new Map(
      ((members ?? []) as { id: string; email: string | null; activity_state: string }[])
        .filter((m) => m.activity_state === "active" && m.email)
        .map((m) => [String(m.email).toLowerCase(), m.id]),
    );

    const raw = await supabaseAdmin
      .from("guest_passes")
      .select(
        "id, inviting_member_cst_recno, inviting_member_status, converted_member_id, follow_up_consent, follow_up_consent_at, guest_completed_at, events ( ends_at )",
      );
    const extra = new Map(
      (
        (raw.data ?? []) as {
          id: string;
          inviting_member_cst_recno: string | null;
          inviting_member_status: string | null;
          converted_member_id: string | null;
          follow_up_consent: boolean | null;
          follow_up_consent_at: string | null;
          guest_completed_at: string | null;
          events: { ends_at: string | null } | { ends_at: string | null }[] | null;
        }[]
      ).map((r) => [r.id, r]),
    );
    const endsAt = (id: string) => {
      const events = extra.get(id)?.events;
      const event = Array.isArray(events) ? events[0] : events;
      return event?.ends_at ?? null;
    };

    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      eventStartsAt: r.eventStartsAt,
      invitingMemberName: r.invitingMemberName,
      invitingMemberEmail: r.invitingMemberEmail,
      invitingMemberNumber: extra.get(r.id)?.inviting_member_cst_recno ?? null,
      invitingMemberStatus: extra.get(r.id)?.inviting_member_status ?? null,
      guestFullName: r.guestFullName,
      guestEmail: r.guestEmail,
      guestPhone: r.guestPhone,
      guestLocation: r.guestLocation,
      guestPreferredLanguage: r.guestPreferredLanguage,
      guestCoachingLevel: r.guestCoachingLevel,
      guestProfessionalFocus: r.guestProfessionalFocus,
      guestOtherAssociations: r.guestOtherAssociations,
      guestNotes: r.guestNotes,
      guestCompletedAt: extra.get(r.id)?.guest_completed_at ?? null,
      followUpConsent: Boolean(extra.get(r.id)?.follow_up_consent),
      followUpConsentAt: extra.get(r.id)?.follow_up_consent_at ?? null,
      eventEndsAt: endsAt(r.id),
      status: r.status,
      decisionAt: r.decisionAt,
      decisionNote: r.decisionNote,
      registrationId: r.registrationId,
      checkedInAt: r.registrationId ? (checkedIn.get(r.registrationId) ?? null) : null,
      followUpStatus: r.followUpStatus,
      followUpNote: r.followUpNote,
      convertedMemberId: extra.get(r.id)?.converted_member_id ?? null,
      matchedMemberId: memberByEmail.get(r.guestEmail.toLowerCase()) ?? null,
      createdAt: r.createdAt,
    }));
  });

/**
 * One pass in full, for the M&E detail screen. Same gate and same projection
 * as the list; the extra profile fields never leave this role.
 */
export const getGuestPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ passId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<StaffGuestPass | null> => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);
    const rows = await listAllGuestPasses();
    return rows.find((row) => row.id === data.passId) ?? null;
  });

/** CSV of the whole pilot. Headers come localised from the caller. */
export const exportGuestPasses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ headers: z.array(z.string().max(80)).length(18) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertMembership } = await import("./authz");
    await assertMembership(context);
    const { buildGuestPassesCsv } = await import("./guest-passes-export.server");
    return buildGuestPassesCsv(data.headers);
  });

export type ApprovedGuest = {
  id: string;
  guestName: string;
  invitedBy: string | null;
  status: string;
};

/**
 * The approved guests for one event, for the Community/Project Leader running
 * it. Read through the caller's own client so `private.event_is_managed_by`
 * decides — and projected down to the name and the inviting member, never the
 * guest's contact details.
 */
export const listApprovedGuestsForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ApprovedGuest[]> => {
    const { data: rows, error } = await context.supabase
      .from("guest_passes")
      .select("id, guest_full_name, inviting_member_name, status")
      .eq("event_id", data.eventId)
      .in("status", ["approved", "registered", "attended"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return ((rows ?? []) as Record<string, string>[]).map((r) => ({
      id: r["id"] as string,
      guestName: r["guest_full_name"] as string,
      invitedBy: (r["inviting_member_name"] as string) ?? null,
      status: r["status"] as string,
    }));
  });
