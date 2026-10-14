/**
 * Advertising click redirect (`/goto/:placementId`).
 *
 * The only tracking we do for advertisers: a counter per placement. No cookie,
 * no identifier, no logging of the visitor — the definer function increments
 * `clicks_count` and we redirect to the advertiser's own URL. A placement that
 * is not live, or has no destination, sends the visitor to the homepage.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/goto/$placementId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.placementId;
        const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuid.test(id)) return new Response(null, { status: 302, headers: { location: "/" } });

        const { publicSupabaseClient } = await import("@/lib/supabase-public.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = publicSupabaseClient() as any;

        let destination = "/";
        try {
          const { data } = await db
            .from("ad_placements")
            .select("cta_url")
            .eq("id", id)
            .maybeSingle();
          const url = (data as { cta_url: string | null } | null)?.cta_url ?? null;
          const { fetchFeatureFlags, adClickDestination } = await import("@/lib/feature-flags");
          destination = adClickDestination(await fetchFeatureFlags(), url);
          if (destination !== "/") {
            await db.rpc("ad_placement_click", { _placement_id: id });
          }
        } catch {
          // A counter must never cost the visitor their click.
        }

        return new Response(null, { status: 302, headers: { location: destination } });
      },
    },
  },
});
