/**
 * API route for Europe Pulse automated scanning (/api/public/europe-pulse-scan).
 * Exports: Route. Handles POST requests from cron to trigger news aggregation.
 */

import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly Europe Pulse scan endpoint, called by pg_cron via pg_net.
 *
 * Auth is the same server-only cron token pattern as the member sync: a secret
 * in `x-cron-token`, never the publishable key (which ships to every browser
 * and would let anyone burn Firecrawl and AI credits). This endpoint prefers
 * its own `EUROPE_PULSE_CRON_TOKEN` when one is configured, so leaking it
 * cannot also trigger a member sync.
 */
export const Route = createFileRoute("/api/public/europe-pulse-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request, "EUROPE_PULSE_CRON_TOKEN")) {
          // Never log the token itself — only that a call was rejected.
          console.warn("[europe-pulse] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        const startedAt = Date.now();
        console.log("[europe-pulse] start trigger=cron");
        const { runEuropePulse } = await import("@/lib/europe-pulse.server");
        try {
          const result = await runEuropePulse({ triggerSource: "cron" });
          const line =
            `[europe-pulse] done status=${result.status} run=${result.runId} ` +
            `week=${result.weekOf} chapters=${result.chaptersOk}/${result.chaptersOk + result.chaptersFailed} ` +
            `raw=${result.rawItems} items=${result.curatedItems} ms=${Date.now() - startedAt}`;
          if (result.status === "succeeded") console.log(line);
          else console.error(`${line} error=${JSON.stringify(result.error ?? "")}`);
          return Response.json(result, { status: result.status === "succeeded" ? 200 : 500 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Europe Pulse run threw";
          console.error(
            `[europe-pulse] failed ms=${Date.now() - startedAt} error=${JSON.stringify(message)}`,
          );
          throw err;
        }
      },
    },
  },
});
