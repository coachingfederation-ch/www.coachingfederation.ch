/**
 * Password reset request — rate-limited, outcome-neutral.
 *
 * The reset mail is triggered server-side so the throttle cannot be skipped by
 * calling Supabase directly from the browser, and so the response never
 * differs between "account exists" and "no such account": the endpoint must
 * not be usable to probe which addresses belong to members.
 *
 * Exports: requestPasswordReset (createServerFn). Called by
 * routes/forgot-password.tsx.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  /** Chapter language, carried into the reset link so the email matches it. */
  locale: z.enum(["en", "de", "fr", "it"]).default("en"),
  redirectOrigin: z.string().url().max(255),
  // Honeypot: must stay empty.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type PasswordResetInput = z.input<typeof schema>;

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    // Always the same answer, whatever happens below.
    const neutral = { ok: true as const };
    if (data.website) return neutral;

    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const ip = clientIp(request);
    const email = data.email.trim().toLowerCase();

    // Two buckets: one caps a single host, the other caps repeats against one
    // mailbox, so neither probing nor mail-bombing is worthwhile.
    const byIp = await checkRateLimit("password-reset-ip", `ip:${ip}`, [
      { windowSeconds: 3_600, max: 10 },
      { windowSeconds: 86_400, max: 30 },
    ]);
    if (!byIp.allowed) return neutral;

    const byEmail = await checkRateLimit("password-reset-email", `email:${email}`, [
      { windowSeconds: 3_600, max: 3 },
      { windowSeconds: 86_400, max: 8 },
    ]);
    if (!byEmail.allowed) return neutral;

    const origin = data.redirectOrigin.replace(/\/$/, "");
    const redirectTo = `${origin}/reset-password?lang=${data.locale}`;

    try {
      const { publicSupabaseClient } = await import("./supabase-public.server");
      const { error } = await publicSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      // Logged server-side only: the caller must not learn whether it worked.
      if (error) console.error("password reset request failed", error.message);
    } catch (err) {
      console.error("password reset request threw", err);
    }

    return neutral;
  });
