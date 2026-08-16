/**
 * One-time QR sign-in for the volunteer console.
 *
 * The QR carries an opaque token; only its SHA-256 hash is stored, so a
 * database reader cannot replay it. Redemption is single use and short lived,
 * and it only ever works for an account that is still an activated volunteer.
 * The session itself is minted by Supabase (a magic-link `token_hash` the
 * phone verifies), so we never handle passwords or long-lived credentials.
 *
 * Exports: TOKEN_TTL_MINUTES, mintLoginToken, redeemLoginToken.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const TOKEN_TTL_MINUTES = 10;

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Issue a fresh code for a volunteer, retiring any earlier unused ones. */
export async function mintLoginToken(userId: string): Promise<string | null> {
  const { data: volunteer } = await supabaseAdmin
    .from("live_chat_volunteers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!volunteer) return null;

  await supabaseAdmin.from("live_chat_login_tokens").delete().eq("user_id", userId);

  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin.from("live_chat_login_tokens").insert({
    user_id: userId,
    token_hash: hash(token),
    expires_at: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) return null;
  return token;
}

/**
 * Exchange a scanned code for a Supabase magic-link `token_hash`.
 * Returns null for anything that is not a fresh, unused code belonging to a
 * still-activated volunteer — callers must keep that response neutral.
 */
export async function redeemLoginToken(token: string): Promise<{ tokenHash: string } | null> {
  const nowIso = new Date().toISOString();
  const { data: row } = await supabaseAdmin
    .from("live_chat_login_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!row || row.used_at || (row.expires_at as string) < nowIso) return null;

  // Burn first: a second scan of the same code must fail even on a race.
  const { data: burned } = await supabaseAdmin
    .from("live_chat_login_tokens")
    .update({ used_at: nowIso })
    .eq("id", row.id as string)
    .is("used_at", null)
    .select("id");
  if ((burned ?? []).length === 0) return null;

  const userId = row.user_id as string;
  const { data: volunteer } = await supabaseAdmin
    .from("live_chat_volunteers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!volunteer) return null;

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = user?.user?.email;
  if (!email) return null;

  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (error || !tokenHash) return null;
  return { tokenHash };
}
