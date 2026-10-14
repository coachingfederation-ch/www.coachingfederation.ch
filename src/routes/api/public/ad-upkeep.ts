/**
 * Nightly advertising upkeep (`/api/public/ad-upkeep`).
 *
 * Called by pg_cron via pg_net with the shared cron token. Retires placements
 * whose contract period has ended and sends the single 30-day reminder before
 * a placement expires.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ad-upkeep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[ad-upkeep] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runAdPlacementUpkeep } = await import("@/lib/ads-upkeep.server");
          const result = await runAdPlacementUpkeep();
          console.log(`[ad-upkeep] expired=${result.expired} reminded=${result.reminded}`);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "upkeep threw";
          console.error(`[ad-upkeep] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "upkeep failed" }, { status: 500 });
        }
      },
    },
  },
});
