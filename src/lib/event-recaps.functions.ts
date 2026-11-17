/**
 * Public RPC surface for event recaps.
 * Exports: getRecapDownloadsPublic, getRecapDownloads.
 * Called by components/events/EventRecap.tsx.
 *
 * The recap itself travels with `getPublicEvent`, so the page renders server
 * side without a second round trip. Only the gated download links live here,
 * because they must be minted per caller and never cached into a page.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ eventId: z.string().uuid() });

/**
 * Loads a published recap's audience setting. Defaults to the anonymous
 * client; signed-in callers pass their own RLS-bound client, because a recap
 * inherits its event's visibility and invite-only events are hidden from anon.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function publishedRecap(eventId: string, client?: any) {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data } = await (client ?? publicSupabaseClient())
    .from("event_recaps")
    .select("id, downloads_audience")
    .eq("event_id", eventId)
    .eq("status", "published")
    .maybeSingle();
  return (data as { id: string; downloads_audience: "attendees" | "members" | "public" } | null) ?? null;
}

/**
 * Downloads for a recap the chapter opened to everyone. Any other audience
 * gets an empty list — the signed-in path below is the only way in.
 */
export const getRecapDownloadsPublic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const recap = await publishedRecap(data.eventId);
    if (!recap || recap.downloads_audience !== "public") return { entitled: false, items: [] };
    const { signRecapDownloads } = await import("./event-recaps.server");
    return { entitled: true, items: await signRecapDownloads(recap.id) };
  });

/**
 * Downloads for a signed-in visitor, after the entitlement check. Also serves
 * `public` recaps to signed-in visitors, so invite-only events work for guests.
 */
export const getRecapDownloads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const recap = await publishedRecap(data.eventId, context.supabase);
    if (!recap) return { entitled: false, items: [] };
    const { recapEntitlement, signRecapDownloads } = await import("./event-recaps.server");
    const entitled = await recapEntitlement(
      data.eventId,
      recap.downloads_audience,
      context.userId,
    );
    if (!entitled) return { entitled: false, items: [] };
    return { entitled: true, items: await signRecapDownloads(recap.id) };
  });
