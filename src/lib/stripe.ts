/**
 * Browser-side Stripe.js loader for the built-in payments connection.
 *
 * VITE_PAYMENTS_CLIENT_TOKEN is pk_test_… in the preview and pk_live_… on the
 * published site; its prefix decides sandbox vs live. Missing = paid
 * registration disabled on the page.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken: string | undefined = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN || undefined;

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
