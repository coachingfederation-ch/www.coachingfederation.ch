/**
 * Browser-side Stripe.js loader for the chapter's own Stripe account.
 *
 * The publishable key is public by design and must belong to the same Stripe
 * account (and mode) as the server's STRIPE_RESTRICTED_API_KEY. Its prefix
 * decides test vs live; an empty key disables paid registration on the page.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

// Chapter Stripe account publishable key (pk_live_… or pk_test_…).
const STRIPE_PUBLISHABLE_KEY = "";

const clientToken: string | undefined = STRIPE_PUBLISHABLE_KEY || undefined;

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
