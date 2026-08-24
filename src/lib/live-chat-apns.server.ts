/**
 * APNs (Apple Push Notification service) push for activated live-chat
 * volunteers.
 *
 * Mirrors {@link live-chat-push.server.ts}: subscriptions are service-role
 * only (`live_chat_apns_subscriptions` grants nothing to `anon`/`authenticated`),
 * so every read and write goes through this module. Fan-out is best effort —
 * a push that fails with 400/410 means Apple considers the token invalid, so we
 * delete it rather than retry. A push outage must never stop a visitor from
 * queueing, so every error is swallowed.
 *
 * Exports: saveApnsSubscription, removeApnsSubscription,
 * notifyWaitingVisitorApns.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const APNS_HOST = "https://api.push.apple.com";
const TOKEN_TTL_SECONDS = 30 * 60; // provider tokens are valid up to 1h; we mint fresh every 30min

type CachedToken = { jwt: string; exp: number };
let cachedToken: CachedToken | null = null;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

/** Decode the body of a PEM key (strip header/footer and base64-decode). */
function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN EC PRIVATE KEY-----/g, "")
    .replace(/-----END EC PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build a short-lived ES256 provider token signed with the APNs key. */
async function providerToken(): Promise<string | null> {
  const keyPem = process.env["APNS_KEY"];
  const keyId = process.env["APNS_KEY_ID"];
  const teamId = process.env["APNS_TEAM_ID"];
  if (!keyPem || !keyId || !teamId) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.jwt;

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const signingInput = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(JSON.stringify(payload))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(keyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
  cachedToken = { jwt, exp: now + TOKEN_TTL_SECONDS };
  return jwt;
}

export async function saveApnsSubscription(userId: string, token: string): Promise<void> {
  const { error } = await supabaseAdmin.from("live_chat_apns_subscriptions").upsert(
    { user_id: userId, device_token: token },
    { onConflict: "user_id,device_token" },
  );
  if (error) throw new Error(error.message);
}

export async function removeApnsSubscription(userId: string, token: string): Promise<void> {
  await supabaseAdmin
    .from("live_chat_apns_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("device_token", token);
}

/** One visitor is waiting: tell every volunteer who registered an iOS device. */
export async function notifyWaitingVisitorApns(visitorName: string): Promise<{ sent: number }> {
  const token = await providerToken();
  if (!token) return { sent: 0 };

  const topic = process.env["APNS_TOPIC"] ?? "ch.coachingfederation.icf.volunteers";
  const { data } = await supabaseAdmin
    .from("live_chat_apns_subscriptions")
    .select("user_id, device_token");
  const rows = data ?? [];
  if (rows.length === 0) return { sent: 0 };

  const payload = {
    aps: {
      alert: { title: "New chat waiting", body: `${visitorName} would like to talk to a volunteer.` },
      sound: "default",
      badge: 1,
    },
    action: "openWaitingChat",
  };
  const body = JSON.stringify(payload);

  let sent = 0;
  const stale: { user_id: string; device_token: string }[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        const response = await fetch(`${APNS_HOST}/3/device/${row.device_token}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "apns-topic": topic,
            "apns-priority": "10",
            "apns-push-type": "alert",
            "content-type": "application/json",
          },
          body,
        });
        if (response.status === 400 || response.status === 410) {
          stale.push({
            user_id: row.user_id as string,
            device_token: row.device_token as string,
          });
          return;
        }
        if (response.ok) sent += 1;
      } catch {
        // A single unreachable device must not break the fan-out.
      }
    }),
  );

  if (stale.length > 0) {
    // Delete stale tokens one by one (composite key).
    await Promise.all(
      stale.map((s) =>
        supabaseAdmin
          .from("live_chat_apns_subscriptions")
          .delete()
          .eq("user_id", s.user_id)
          .eq("device_token", s.device_token),
      ),
    );
  }
  return { sent };
}
