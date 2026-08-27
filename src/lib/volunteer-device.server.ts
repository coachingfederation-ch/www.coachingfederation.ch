/**
 * Seven-day device trust for the installed volunteer console.
 *
 * The Supabase session on a phone is fragile: refresh-token rotation across a
 * second device, or storage eviction in the installed app's own container,
 * both end with "no stored session" on the next launch — which is what put
 * volunteers back on the QR screen roughly a day after signing in.
 *
 * A device token is a second, longer-lived credential the console can fall
 * back on. It follows the same rules as the QR code: opaque value, only the
 * SHA-256 hash stored, single use (each redemption rotates it), bound to an
 * account that is still an activated volunteer, and exchanged only for a
 * Supabase-minted magic-link hash — never a password.
 *
 * Exports: DEVICE_TTL_DAYS, issueDeviceToken, redeemDeviceToken, revokeDeviceTokens.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEVICE_TTL_DAYS = 7;

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function expiry() {
  return new Date(Date.now() + DEVICE_TTL_DAYS * 86_400_000).toISOString();
}

async function isVolunteer(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("live_chat_volunteers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/** Mint a fresh device token for an activated volunteer. */
export async function issueDeviceToken(userId: string): Promise<string | null> {
  if (!(await isVolunteer(userId))) return null;

  // Housekeeping: drop this account's expired rows so a lost device's token
  // cannot linger past its window.
  await supabaseAdmin
    .from("live_chat_device_tokens")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString());

  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin.from("live_chat_device_tokens").insert({
    user_id: userId,
    token_hash: hash(token),
    expires_at: expiry(),
  });
  if (error) return null;
  return token;
}

/**
 * Exchange a stored device token for a Supabase magic-link `token_hash` plus a
 * rotated device token. Returns null for anything that is not a live token
 * belonging to a still-activated volunteer; callers keep that answer neutral.
 */
export async function redeemDeviceToken(
  token: string,
): Promise<{ tokenHash: string; deviceToken: string | null } | null> {
  const nowIso = new Date().toISOString();
  const { data: row } = await supabaseAdmin
    .from("live_chat_device_tokens")
    .select("id, user_id, expires_at")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!row || (row.expires_at as string) < nowIso) return null;

  const userId = row.user_id as string;
  if (!(await isVolunteer(userId))) return null;

  // Burn first: a replayed token must fail even on a race.
  const { data: burned } = await supabaseAdmin
    .from("live_chat_device_tokens")
    .delete()
    .eq("id", row.id as string)
    .select("id");
  if ((burned ?? []).length === 0) return null;

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = user?.user?.email;
  if (!email) return null;

  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return null;

  // Rolling window: a volunteer who opens the app weekly never scans again.
  const deviceToken = await issueDeviceToken(userId);
  return { tokenHash, deviceToken };
}

/** Opting out of volunteering invalidates every device this account trusted. */
export async function revokeDeviceTokens(userId: string): Promise<void> {
  await supabaseAdmin.from("live_chat_device_tokens").delete().eq("user_id", userId);
}
