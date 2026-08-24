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

/** Loads a published recap's audience setting through the anonymous client. */
async function publishedRecap(eventId: string) {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data } = await publicSupabaseClient()
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

/** Downloads for a signed-in attendee or member, after the entitlement check. */
export const getRecapDownloads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const recap = await publishedRecap(data.eventId);
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
