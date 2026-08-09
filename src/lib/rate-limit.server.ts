/**
 * Durable per-caller rate limiting.
 *
 * The site runs on a stateless edge runtime, so an in-memory counter would be
 * reset on every isolate. Hits are therefore recorded in `api_rate_limits`
 * (service-role only) and counted over a sliding window.
 *
 * The limiter deliberately FAILS OPEN: if the database is unreachable the
 * request is allowed through, because losing the assistant or a lead form is
 * worse than briefly losing the throttle.
 *
 * Exports: clientIp, checkRateLimit, rateLimitResponse.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitRule = { windowSeconds: number; max: number };

export type RateLimitVerdict = { allowed: boolean; retryAfterSeconds: number };

/** Best-effort caller identity behind the edge proxy. */
export function clientIp(request: Request): string {
  const header =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for") ??
    "";
  const first = header.split(",")[0]?.trim();
  return first && first.length <= 64 ? first : "unknown";
}

/**
 * Counts prior hits in each window and records the current one when allowed.
 * Rules are checked longest-window-first so the daily cap wins the Retry-After.
 */
export async function checkRateLimit(
  bucket: string,
  subject: string,
  rules: RateLimitRule[],
): Promise<RateLimitVerdict> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as SupabaseClient;
    const ordered = [...rules].sort((a, b) => b.windowSeconds - a.windowSeconds);

    for (const rule of ordered) {
      const since = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();
      const { count, error } = await admin
        .from("api_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("bucket", bucket)
        .eq("subject", subject)
        .gte("hit_at", since);
      if (error) return { allowed: true, retryAfterSeconds: 0 };
      if ((count ?? 0) >= rule.max) {
        return { allowed: false, retryAfterSeconds: rule.windowSeconds };
      }
    }

    await admin.from("api_rate_limits").insert({ bucket, subject });

    // Opportunistic cleanup: ~2% of allowed calls prune rows older than a day.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 86_400_000).toISOString();
      await admin.from("api_rate_limits").delete().lt("hit_at", cutoff);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function rateLimitResponse(verdict: RateLimitVerdict, message: string): Response {
  return new Response(message, {
    status: 429,
    headers: {
      "retry-after": String(verdict.retryAfterSeconds),
      "content-type": "text/plain; charset=utf-8",
    },
  });
}