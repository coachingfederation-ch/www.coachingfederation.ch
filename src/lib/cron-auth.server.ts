/**
 * Shared-secret authentication for the pg_cron-triggered public endpoints.
 *
 * Comparison is constant-time so a caller cannot learn the token byte by byte,
 * and each endpoint may carry its own token: leaking the Europe Pulse token
 * must not also unlock a full member sync. When an endpoint-specific token is
 * not configured the shared `MEMBER_SYNC_CRON_TOKEN` still applies, so the
 * existing cron jobs keep working until the second token is provisioned.
 *
 * Exports: isAuthorisedCronRequest.
 */
function safeEqual(a: string, b: string): boolean {
  // Length is not secret (it leaks from the header anyway); the bytes are.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * @param specificTokenEnv name of an optional endpoint-specific env var
 */
export function isAuthorisedCronRequest(request: Request, specificTokenEnv?: string): boolean {
  const provided = request.headers.get("x-cron-token");
  if (!provided) return false;

  const candidates = [
    specificTokenEnv ? process.env[specificTokenEnv] : undefined,
    // Fallback keeps the currently scheduled jobs authenticated.
    specificTokenEnv && process.env[specificTokenEnv]
      ? undefined
      : process.env["MEMBER_SYNC_CRON_TOKEN"],
  ].filter((value): value is string => Boolean(value));

  return candidates.some((expected) => safeEqual(provided, expected));
}