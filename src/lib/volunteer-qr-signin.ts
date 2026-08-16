/**
 * Shared client helper for the volunteer QR sign-in.
 *
 * Both entry points use it: the deep link (/volunteer-login/$token, scanned
 * with the system camera) and the in-app scanner (/volunteer-login, used by
 * the installed home-screen app, which has its own storage container and so
 * never inherits the Safari session).
 *
 * The scanned payload may be a full URL or a bare token; we normalise both.
 * Failures stay neutral — a code is simply "no longer valid".
 */
import { supabase } from "@/integrations/supabase/client";
import { redeemVolunteerLoginCode } from "@/lib/volunteer-qr.functions";

/** Pull the opaque token out of a scanned URL, or accept a bare token. */
export function extractVolunteerToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const match = value.match(/volunteer-login\/([A-Za-z0-9_-]{10,200})/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{10,200}$/.test(value)) return value;
  return null;
}

/** Redeem a code and establish the Supabase session in this browser. */
export async function signInWithVolunteerToken(token: string): Promise<boolean> {
  const { tokenHash } = await redeemVolunteerLoginCode({ data: { token } }).catch(() => ({
    tokenHash: null,
  }));
  if (!tokenHash) return false;
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return !error;
}
