/**
 * Public ticketing endpoints.
 *
 * Reads only. Nothing here decides entitlement or price for a registration —
 * that happens inside the registration handlers and the database trigger.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EventTicketing, MembershipState } from "./tickets";

const localeSchema = z.enum(["en", "de", "fr", "it"]);

const ticketingInput = z.object({
  eventId: z.string().uuid(),
  locale: localeSchema,
  // Personal `?invite=` token: opens an invite-only event's tiers and questions.
  invite: z.string().trim().min(16).max(128).optional().nullable(),
});

/** Active tiers and registration questions for one published event. */
export const getEventTicketing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ticketingInput.parse(input))
  .handler(async ({ data }): Promise<EventTicketing> => {
    const { loadEventTicketing, resolveTicketingReader } = await import("./tickets.server");
    const reader = await resolveTicketingReader(data.eventId, { inviteToken: data.invite });
    return loadEventTicketing(data.eventId, data.locale, null, reader);
  });

/**
 * The same, for a signed-in caller: invite-only events are read through the
 * caller's own RLS-bound client, so guest-list members, confirmed attendees
 * and managers see the tiers and questions without a token.
 */
export const getMyEventTicketing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ticketingInput.parse(input))
  .handler(async ({ data, context }): Promise<EventTicketing> => {
    const { loadEventTicketing, resolveTicketingReader } = await import("./tickets.server");
    const reader = await resolveTicketingReader(data.eventId, {
      userClient: context.supabase,
      inviteToken: data.invite,
    });
    return loadEventTicketing(data.eventId, data.locale, null, reader);
  });

/** Whether the signed-in visitor's membership is active right now. */
export const getMyMembershipState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembershipState> => {
    const { resolveMembership } = await import("./tickets.server");
    return resolveMembership(context.userId);
  });

/** Prefill values for the registration form of a signed-in visitor. */
export const getMyRegistrationIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ fullName: string; email: string }> => {
    const { loadRegistrationIdentity } = await import("./tickets.server");
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    return loadRegistrationIdentity(context.userId, email);
  });

/**
 * Advisory check of an ICF member id typed into the registration form. Public
 * on purpose — a visitor without an account must be able to claim member
 * pricing — so it is rate limited per caller and answers only "confirmed or
 * not", never whether the id exists. The submit path verifies again before any
 * price is applied.
 */
export const verifyMemberId = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ memberId: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ confirmed: boolean }> => {
    const { clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { resolveMembership } = await import("./tickets.server");
    const subject = `ip:${clientIp(getRequest())}`;
    const state = await resolveMembership(null, data.memberId, subject);
    return { confirmed: state === "member" };
  });

/**
 * Read-only status of a Stripe Checkout return. Fulfillment (`pending -> paid`,
 * confirmation email) runs only from the signature-verified webhook; this just
 * reports what the database already says, so the visitor sees "pending" until
 * the webhook lands and the panel polls briefly. The session id is an
 * unguessable Stripe identifier and the answer is a single status word.
 */
export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().min(10).max(200),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ status: "paid" | "pending" | "failed" }> => {
    const { readCheckoutStatus } = await import("./tickets.server");
    try {
      return { status: await readCheckoutStatus(data.sessionId) };
    } catch (e) {
      console.error("Checkout status lookup failed", e);
      return { status: "failed" };
    }
  });
