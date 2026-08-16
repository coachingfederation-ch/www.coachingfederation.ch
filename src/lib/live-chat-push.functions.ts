/**
 * Server functions for volunteer push notifications.
 *
 * All three are scoped to the caller's own subscriptions; the public VAPID key
 * is safe to hand out (it is the browser-side half of the signing pair).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(400),
  auth: z.string().min(1).max(200),
});

export const getPushConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ publicKey: string }> => {
    const { vapidPublicKey } = await import("./live-chat-push.server");
    return { publicKey: vapidPublicKey() };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { saveSubscription } = await import("./live-chat-push.server");
    await saveSubscription(context.userId, data);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    const { removeSubscription } = await import("./live-chat-push.server");
    await removeSubscription(context.userId, data.endpoint);
    return { ok: true };
  });
