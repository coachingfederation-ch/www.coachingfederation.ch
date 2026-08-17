/**
 * Invitation-only events — server functions.
 *
 * Staff calls go through the caller's own RLS-scoped client first, so the
 * event policies decide who may manage the guest list before the trusted path
 * mints a token. The two public calls only ever answer about the token they
 * were given, and are rate limited.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";

const eventSchema = z.object({ eventId: z.string().uuid() });

/** Proves the caller may manage this event before any admin-side read/write. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertManagesEvent(context: any, eventId: string) {
  await assertOrganizer(context);
  const { data, error } = await context.supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) throw new Error("This event is not available.");
}

/** Staff: the whole guest list for one event. */
export const listEventInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertManagesEvent(context, data.eventId);
    const { listInvitations } = await import("./event-invitations.server");
    return listInvitations(data.eventId);
  });

/** Staff: active members who could still be added to this event's guest list. */
export const searchInvitableMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    eventSchema.extend({ query: z.string().trim().max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagesEvent(context, data.eventId);
    const { listInvitableMembers } = await import("./event-invitations.server");
    return listInvitableMembers(data.eventId, data.query);
  });

/** Staff: add one member and send their personal invitation immediately. */
export const addEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    eventSchema.extend({ memberId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagesEvent(context, data.eventId);
    const { addInvitation } = await import("./event-invitations.server");
    return addInvitation(data.eventId, data.memberId, context.userId);
  });

/** Staff: mint a fresh link and send the invitation again. */
export const resendEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    eventSchema.extend({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagesEvent(context, data.eventId);
    const { resendInvitation } = await import("./event-invitations.server");
    return resendInvitation(data.invitationId);
  });

/** Staff: take somebody off the guest list. Any registration they made stays. */
export const removeEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    eventSchema.extend({ invitationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagesEvent(context, data.eventId);
    const { error } = await context.supabase
      .from("event_invitations")
      .delete()
      .eq("id", data.invitationId)
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const tokenSchema = eventSchema.extend({ token: z.string().trim().min(8).max(128) });

async function tokenRateLimit(bucket: string) {
  const { clientIp, checkRateLimit } = await import("./rate-limit.server");
  const { getRequest } = await import("@tanstack/react-start/server");
  const verdict = await checkRateLimit(bucket, `ip:${clientIp(getRequest())}`, [
    { windowSeconds: 300, max: 20 },
    { windowSeconds: 86_400, max: 200 },
  ]);
  return verdict.allowed;
}

/**
 * Resolves a personal invitation so the registration form can unlock and
 * prefill. Returns null for anything used, withdrawn or unknown — the answer
 * never says which.
 */
export const checkEventInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await tokenRateLimit("event-invitation-check"))) return null;
    const { resolveInvitationToken } = await import("./event-invitations.server");
    const invitation = await resolveInvitationToken(data.eventId, data.token);
    if (!invitation) return null;
    return { fullName: invitation.fullName, email: invitation.email };
  });

/** "I can't make it", from the same personal link. */
export const declineEventInvitation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    if (!(await tokenRateLimit("event-invitation-decline"))) return { ok: false as const };
    const { declineInvitation } = await import("./event-invitations.server");
    return declineInvitation(data.eventId, data.token);
  });
