/**
 * Stripe payment confirmation endpoint.
 *
 * Public by design — Stripe never sends a session token. The signature check
 * in `verifyWebhook` is the security boundary. Every handler is idempotent, so
 * a retried or replayed event leaves registrations and seat counts unchanged.
 */
import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleWebhook(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  const object = event.data.object as { id?: string; payment_status?: string };
  const { finalizePaidRegistration, releaseCheckoutSession } = await import("@/lib/tickets.server");

  switch (event.type) {
    case "checkout.session.completed":
      // Delayed methods (SEPA and friends) stay "unpaid" until settlement.
      if (object.id && object.payment_status !== "unpaid") {
        await finalizePaidRegistration(object.id);
      }
      break;
    case "checkout.session.async_payment_succeeded":
      if (object.id) await finalizePaidRegistration(object.id);
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      if (object.id) await releaseCheckoutSession(object.id);
      break;
    case "charge.refunded": {
      // Refunds issued in the Stripe dashboard are recorded on the
      // registration; the seat is kept (staff cancel separately if needed).
      const charge = event.data.object as {
        payment_intent?: string;
        amount_refunded?: number;
        refunds?: { data?: { id: string }[] };
      };
      if (!charge.payment_intent) break;
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(env);
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: charge.payment_intent,
        limit: 1,
      });
      const sessionId = sessions.data[0]?.id;
      if (!sessionId) break;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("event_registrations")
        .update({
          refund_status: "refunded",
          refund_amount_cents: charge.amount_refunded ?? undefined,
          stripe_refund_id: charge.refunds?.data?.[0]?.id ?? null,
          refunded_at: new Date().toISOString(),
          refund_error: null,
        })
        .eq("stripe_session_id", sessionId)
        .neq("refund_status", "refunded");
      break;
    }
    default:
      console.log("Unhandled Stripe event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Stripe webhook with invalid env parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Stripe webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
