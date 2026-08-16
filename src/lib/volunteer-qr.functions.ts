/**
 * Server functions behind the volunteer QR sign-in.
 *
 * `createVolunteerLoginCode` is authenticated and self-scoped.
 * `redeemVolunteerLoginCode` is necessarily public — the phone scanning the
 * code has no session yet — so it is rate limited and answers neutrally.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createVolunteerLoginCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ token: string | null; expiresInMinutes: number }> => {
    const { mintLoginToken, TOKEN_TTL_MINUTES } = await import("./volunteer-qr.server");
    const token = await mintLoginToken(context.userId);
    return { token, expiresInMinutes: TOKEN_TTL_MINUTES };
  });

export const redeemVolunteerLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(10).max(200) }).parse(input))
  .handler(async ({ data }): Promise<{ tokenHash: string | null }> => {
    const { clientIp, checkRateLimit } = await import("./rate-limit.server");
    const ip = clientIp(getRequest());
    const verdict = await checkRateLimit("volunteer-qr-login", ip, [
      { windowSeconds: 300, max: 10 },
      { windowSeconds: 86_400, max: 60 },
    ]);
    if (!verdict.allowed) return { tokenHash: null };

    const { redeemLoginToken } = await import("./volunteer-qr.server");
    const result = await redeemLoginToken(data.token);
    return { tokenHash: result?.tokenHash ?? null };
  });
