/**
 * API route for Europe Pulse automated scanning (/api/public/europe-pulse-scan).
 * Exports: Route. Handles POST requests from cron to trigger news aggregation.
 */

import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly Europe Pulse scan endpoint, called by pg_cron via pg_net.
 *
 * Two shapes of call:
 * - `{}` — the weekly trigger: create a run, then work its first slice.
 * - `{"advance": true}` — resume whatever run is unfinished (the hand-over
 *   between slices, and the hourly backstop).
 *
 * A slice is short by design; when the run is not finished the handler wakes
 * the next slice before returning, so one long request never has to cover the
 * whole five-minute scan.
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

        const body = (await request.json().catch(() => ({}))) as { advance?: boolean };
        const startedAt = Date.now();
        const { startEuropePulseRun, advanceEuropePulseRun, kickNextSlice } = await import(
          "@/lib/europe-pulse.server"
        );

        try {
          let runId: string | undefined;
          if (!body.advance) {
            console.log("[europe-pulse] start trigger=cron");
            runId = (await startEuropePulseRun({ triggerSource: "cron" })).runId;
          }
          const progress = await advanceEuropePulseRun(runId);

          if (!progress) {
            // Nothing unfinished, or another slice holds the lock.
            return Response.json({ advanced: false }, { status: 200 });
          }

          console.log(
            `[europe-pulse] slice run=${progress.runId} phase=${progress.phase} ` +
              `${progress.done}/${progress.total} ok=${progress.chaptersOk} ` +
              `failed=${progress.chaptersFailed} ms=${Date.now() - startedAt}`,
          );

          if (progress.status === "running") kickNextSlice(new URL(request.url).origin);
          return Response.json(progress, { status: progress.status === "failed" ? 500 : 200 });
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

