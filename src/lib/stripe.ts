/**
 * Browser-side Stripe.js loader.
 *
 * The environment is derived from the publishable token's prefix, never from
 * its mere presence: a missing token means the build shipped before Stripe
 * go-live finished, and silently routing that to live would fail deep inside
 * the payment call instead of on the page.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function paymentsConfigured() {
  return Boolean(clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"));
}

export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error("Stripe payments are not configured for this build.");
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    getStripeEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}
