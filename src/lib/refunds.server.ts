/**
 * Refunds for cancelled paid event registrations.
 *
 * Server-only, service-role: the refund columns are locked to the trusted path
 * by the registration guard trigger. Every refund carries an idempotency key
 * derived from the registration id, so a retry — or two staff pressing cancel
 * at the same moment — can never refund twice.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { StripeEnv } from "./stripe.server";

export type RefundOutcome =
  | { status: "refunded"; amountCents: number }
  | { status: "skipped"; reason: "not_paid" | "already_refunded" | "no_session" | "not_found" }
  | { status: "failed"; error: string };

type RefundRow = {
  id: string;
  amount_cents: number;
  payment_status: string;
  refund_status: string;
  stripe_session_id: string | null;
  payment_environment: string | null;
};

function environmentOf(row: RefundRow): StripeEnv {
  return row.payment_environment === "live" ? "live" : "sandbox";
}

/**
 * Issues a full refund for one registration.
 *
 * Never throws: the caller has already released the seat, and a refund problem
 * must be recorded on the row for staff to retry, not bubble up as a failed
 * cancellation.
 */
export async function refundRegistration(registrationId: string): Promise<RefundOutcome> {
  const { data: row } = await supabaseAdmin
    .from("event_registrations")
    .select(
      "id, amount_cents, payment_status, refund_status, stripe_session_id, payment_environment",
    )
    .eq("id", registrationId)
    .maybeSingle<RefundRow>();

  if (!row) return { status: "skipped", reason: "not_found" };
  if (row.refund_status === "refunded") return { status: "skipped", reason: "already_refunded" };
  if (row.payment_status !== "paid" || row.amount_cents <= 0) {
    await supabaseAdmin
      .from("event_registrations")
      .update({ refund_status: "not_applicable" })
      .eq("id", registrationId);
    return { status: "skipped", reason: "not_paid" };
  }
  if (!row.stripe_session_id) {
    await supabaseAdmin
      .from("event_registrations")
      .update({ refund_status: "failed", refund_error: "No payment session on this registration" })
      .eq("id", registrationId);
    return { status: "skipped", reason: "no_session" };
  }

  await supabaseAdmin
    .from("event_registrations")
    .update({ refund_status: "pending", refund_error: null })
    .eq("id", registrationId);

  try {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    const stripe = createStripeClient(environmentOf(row));

    // The stored session is the only payment handle we keep; the charge lives
    // on its payment intent.
    const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
    const intent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    if (!intent) throw new Error("The payment for this registration cannot be located");

    try {
      const refund = await stripe.refunds.create(
        { payment_intent: intent, amount: row.amount_cents },
        { idempotencyKey: `refund-${registrationId}` },
      );
      await supabaseAdmin
        .from("event_registrations")
        .update({
          refund_status: "refunded",
          refund_amount_cents: refund.amount ?? row.amount_cents,
          stripe_refund_id: refund.id,
          refunded_at: new Date().toISOString(),
          refund_error: null,
        })
        .eq("id", registrationId);
      return { status: "refunded", amountCents: refund.amount ?? row.amount_cents };
    } catch (e) {
      throw new Error(getStripeErrorMessage(e));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Refund failed", message);
    await supabaseAdmin
      .from("event_registrations")
      .update({ refund_status: "failed", refund_error: message.slice(0, 500) })
      .eq("id", registrationId);
    return { status: "failed", error: message };
  }
}
