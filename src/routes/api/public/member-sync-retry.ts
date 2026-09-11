/**
 * Delayed retry for the nightly member sync (`/api/public/member-sync-retry`).
 *
 * Called by three pg_cron jobs 15, 30 and 45 minutes after the nightly slot with
 * the same server-only cron token as the other scheduled endpoints. The handler
 * decides whether a retry is warranted; the schedule only decides when to ask.
 * The attempt number comes in the body so the third (final) attempt can alert
 * Super Admins.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/member-sync-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[member-sync-retry] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        let attempt = 1;
        try {
          const body = (await request.json()) as { attempt?: number };
          const value = Number(body?.attempt);
          if (Number.isFinite(value) && value >= 1) attempt = Math.min(Math.trunc(value), 3);
        } catch {
          // No body — treat as the first attempt.
        }

        try {
          const { runSyncRetry } = await import("@/lib/member-sync-retry.server");
          const result = await runSyncRetry(attempt);
          console.log(
            `[member-sync-retry] attempt=${attempt} action=${result.action}` +
              `${result.reason ? ` reason=${result.reason}` : ""}` +
              `${result.status ? ` status=${result.status}` : ""}` +
              `${result.alerted ? " alerted=true" : ""}`,
          );
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "retry threw";
          console.error(`[member-sync-retry] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "retry failed" }, { status: 500 });
        }
      },
    },
  },
});
