/**
 * Waitlist — server functions.
 *
 * Public: joining a waitlist and checking an emailed invitation.
 * Staff: listing, inviting and withdrawing entries, through the caller's own
 * RLS-scoped client so the event policies decide who may manage what.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";

const localeSchema = z.enum(["en", "de", "fr", "it"]);

/** Join a waitlist without an account. Rate limited per caller. */
export const joinEventWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        tierId: z.string().uuid().optional().nullable(),
        fullName: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(200),
        locale: localeSchema,
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { clientIp, checkRateLimit } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const subject = `ip:${clientIp(getRequest())}`;
    const verdict = await checkRateLimit("event-waitlist-join", subject, [
      { windowSeconds: 600, max: 8 },
      { windowSeconds: 86_400, max: 40 },
    ]);
    if (!verdict.allowed) return { ok: false as const, reason: "rate_limited" as const };

    const { joinWaitlist } = await import("./waitlist.server");
    return joinWaitlist({
      eventId: data.eventId,
      tierId: data.tierId ?? null,
      fullName: data.fullName,
      email: data.email,
      locale: data.locale,
      note: data.note ?? null,
      userId: null,
    });
  });

/**
 * Resolves an emailed invitation so the registration form can prefill and show
 * the deadline. Returns null for anything expired, used or unknown.
 */
export const checkWaitlistInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), token: z.string().trim().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveInviteToken } = await import("./waitlist.server");
    const invite = await resolveInviteToken(data.eventId, data.token);
    if (!invite) return null;
    return {
      fullName: invite.fullName,
      email: invite.email,
      tierId: invite.tierId,
      expiresAt: invite.expiresAt,
    };
  });

/** Staff: every waitlist entry for one event, newest request last. */
export const listEventWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context.supabase, context.userId);
    const { expireLapsedInvites } = await import("./waitlist.server");
    await expireLapsedInvites(data.eventId);
    const { data: rows, error } = await context.supabase
      .from("event_waitlist_entries")
      .select(
        "id, event_id, tier_id, full_name, email, locale, status, note, invited_at, invite_expires_at, created_at",
      )
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Staff: invite one waiting person and open their time-boxed window. */
export const inviteFromWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ entryId: z.string().uuid(), hours: z.number().int().min(6).max(336).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOrganizer(context.supabase, context.userId);
    // The caller's own client proves they may manage this event before the
    // trusted path mints a token.
    const { data: entry, error } = await context.supabase
      .from("event_waitlist_entries")
      .select("id")
      .eq("id", data.entryId)
      .maybeSingle();
    if (error || !entry) throw new Error("This waitlist entry is not available.");

    const { inviteWaitlistEntry } = await import("./waitlist.server");
    return inviteWaitlistEntry(data.entryId, data.hours);
  });

/** Staff: take somebody off the list (withdrawn on request, or no longer relevant). */
export const withdrawWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOrganizer(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("event_waitlist_entries")
      .update({ status: "withdrawn", invite_token_hash: null })
      .eq("id", data.entryId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
