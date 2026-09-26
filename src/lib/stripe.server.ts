/**
 * Stripe access with the chapter's own Stripe account.
 *
 * `STRIPE_RESTRICTED_API_KEY` is the chapter's own key (rk_/sk_, test or
 * live). The mode of the key decides the environment; a caller asking for the
 * other mode gets a clear error instead of a silent cross-mode charge.
 */
import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

function keyEnvironment(key: string): StripeEnv {
  return /^(rk|sk)_live_/.test(key) ? "live" : "sandbox";
}

export function createStripeClient(env: StripeEnv): Stripe {
  const key = getEnv("STRIPE_RESTRICTED_API_KEY");
  const keyEnv = keyEnvironment(key);
  if (keyEnv !== env) {
    throw new Error(
      `Stripe key is in ${keyEnv === "live" ? "live" : "test"} mode but the page requested ${env === "live" ? "live" : "test"} mode.`,
    );
  }
  return new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }

  return "Stripe request failed";
}

/**
 * Verifies a Stripe webhook signature without the SDK (no gateway hop needed).
 * All `v1` signatures are accepted so a secret rotation does not drop events.
 */
export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  // One endpoint per Stripe account mode; the signing secret comes from the
  // endpoint the chapter registered in its own Stripe dashboard.
  void env;
  const secret = getEnv("STRIPE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1" && value) v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
}
