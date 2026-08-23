/**
 * Scheduled claim-invitation wave endpoint (/api/public/claim-waves).
 * Exports: Route. Called once a day by pg_cron to release the next bounded
 * batch of member claim invitations.
 *
 * Auth is the same server-only cron token as the member sync: the Supabase
 * publishable key ships to every browser and must never be able to trigger a
 * member-facing email run. The wave engine itself is the safety boundary —
 * it refuses to run while the campaign is paused, the release gates are
 * closed, a cutover is in progress, or a wave already went out today.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/claim-waves")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[claim-waves] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const startedAt = Date.now();
        const { runClaimWave } = await import("@/lib/member-claim/waves.server");
        try {
          const result = await runClaimWave({ trigger: "cron" });
          console.log(
            `[claim-waves] done ran=${result.ran} skipped=${result.skipped ?? "-"} ` +
              `invited=${result.invited} reminded=${result.reminded} ` +
              `suppressed=${result.suppressed} ms=${Date.now() - startedAt}`,
          );
          return Response.json(result, { status: 200 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "claim wave threw";
          console.error(`[claim-waves] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
