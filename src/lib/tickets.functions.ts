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

/** Active tiers and registration questions for one published event. */
export const getEventTicketing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), locale: localeSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<EventTicketing> => {
    const { loadEventTicketing } = await import("./tickets.server");
    return loadEventTicketing(data.eventId, data.locale, null);
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
 * Reconciles a Stripe Checkout return. The webhook is the authority; this only
 * catches the case where the visitor is back before the event arrives, and it
 * runs the same idempotent `pending -> paid` update.
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
    const { createStripeClient } = await import("./stripe.server");
    const { finalizePaidRegistration, releaseCheckoutSession } = await import("./tickets.server");
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status && session.payment_status !== "unpaid") {
        await finalizePaidRegistration(session.id);
        return { status: "paid" };
      }
      if (session.status === "expired") {
        await releaseCheckoutSession(session.id);
        return { status: "failed" };
      }
      return { status: "pending" };
    } catch (e) {
      console.error("Checkout confirmation failed", e);
      return { status: "failed" };
    }
  });
