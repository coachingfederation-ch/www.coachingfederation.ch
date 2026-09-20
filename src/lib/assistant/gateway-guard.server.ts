/**
 * Shared abuse guards for the public AI endpoints.
 *
 * Every assistant call spends metered gateway credits, and these widgets need
 * no account, so two guards sit in front of them:
 *
 * 1. `sameOrigin` — the widgets are browser-only and same-origin. A browser
 *    always attaches `Origin` to a cross-origin POST, so a missing or foreign
 *    origin is a script calling us directly, not a visitor on our pages.
 * 2. `withinGatewayBudget` — a site-wide ceiling across all callers, on top of
 *    the per-caller limits. Per-IP throttling alone does not stop a spread of
 *    hosts from draining the budget; this caps what the whole endpoint family
 *    can spend in an hour and in a day.
 */
import { checkRateLimit } from "@/lib/rate-limit.server";

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** Site-wide ceiling shared by every public assistant endpoint. */
export async function withinGatewayBudget(): Promise<boolean> {
  const verdict = await checkRateLimit("ai-gateway-budget", "site", [
    { windowSeconds: 3_600, max: 300 },
    { windowSeconds: 86_400, max: 2_000 },
  ]);
  return verdict.allowed;
}

export function gatewayBusyResponse(): Response {
  return new Response("The assistant is busy right now. Please try again later.", {
    status: 429,
    headers: { "retry-after": "900", "content-type": "text/plain; charset=utf-8" },
  });
}
