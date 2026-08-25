/**
 * Auth header for the fixed-egress ICF relay.
 *
 * The relay used to accept the raw shared secret in `X-Relay-Auth`. It now
 * verifies a signed, expiring token instead, so `ICF_RELAY_AUTH` is the HS256
 * signing key rather than the transmitted value: a captured header stops
 * working within minutes.
 *
 * Server-only. The key and the token are never logged.
 */
import { createHmac } from "node:crypto";

/** Short enough that a captured token is useless quickly, long enough for a slow SOAP call. */
const DEFAULT_TTL_SECONDS = 300;

function b64url(data: string): string {
  return Buffer.from(data).toString("base64url");
}

/** Minimal HS256 JWT — no dependency needed for a two-claim token. */
function signJwt(secret: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: "icf-sync", iat: now, exp: now + ttlSeconds }));
  const signingInput = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

/**
 * Headers to merge into every relay-bound request. Signed fresh per call (never
 * cached), and empty when no key is configured so local/dev runs against ICF
 * directly keep working.
 */
export function relayAuthHeaders(): Record<string, string> {
  const secret = process.env["ICF_RELAY_AUTH"] ?? "";
  return secret ? { "X-Relay-Auth": signJwt(secret) } : {};
}
