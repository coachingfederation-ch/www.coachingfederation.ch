/**
 * Web push for activated live-chat volunteers.
 *
 * Subscriptions are service-role only (`live_chat_push_subscriptions` grants
 * nothing to `anon`/`authenticated`), so every read and write goes through
 * this module. Fan-out is best effort: a push that fails with 404/410 means
 * the browser dropped the subscription, so we delete it rather than retry.
 *
 * Exports: vapidPublicKey, saveSubscription, removeSubscription,
 * hasSubscription, notifyWaitingVisitor.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushKeys = { endpoint: string; p256dh: string; auth: string };

export function vapidPublicKey(): string {
  return process.env["VAPID_PUBLIC_KEY"] ?? "";
}

function vapid() {
  return {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:office@coachingfederation.ch",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
}

export async function saveSubscription(userId: string, sub: PushKeys): Promise<void> {
  const { error } = await supabaseAdmin.from("live_chat_push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint.slice(0, 2000),
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await supabaseAdmin
    .from("live_chat_push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
}

export async function hasSubscription(userId: string, endpoint: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("live_chat_push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  return Boolean(data);
}

/** One visitor is waiting: tell every volunteer who opted in on a device. */
export async function notifyWaitingVisitor(visitorName: string): Promise<{ sent: number }> {
  const keys = vapid();
  if (!keys.publicKey || !keys.privateKey) return { sent: 0 };

  const { data } = await supabaseAdmin
    .from("live_chat_push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  const rows = data ?? [];
  if (rows.length === 0) return { sent: 0 };

  const payload = {
    title: "Someone is waiting in the live chat",
    body: `${visitorName} would like to talk to a volunteer.`,
    url: "/volunteer-chat",
  };

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    rows.map(async (row) => {
      try {
        const request = await buildPushPayload(
          { data: payload, options: { ttl: 600, urgency: "high", topic: "livechat" } },
          {
            endpoint: row.endpoint as string,
            expirationTime: null,
            keys: { p256dh: row.p256dh as string, auth: row.auth as string },
          },
          keys,
        );
        const response = await fetch(row.endpoint as string, {
          method: request.method,
          headers: request.headers,
          body: new Uint8Array(request.body) as unknown as BodyInit,
        });
        if (response.status === 404 || response.status === 410) {
          stale.push(row.id as string);
          return;
        }
        if (response.ok) sent += 1;
      } catch {
        // A single unreachable push service must not break the handover.
      }
    }),
  );

  if (stale.length > 0) {
    await supabaseAdmin.from("live_chat_push_subscriptions").delete().in("id", stale);
  }
  return { sent };
}
