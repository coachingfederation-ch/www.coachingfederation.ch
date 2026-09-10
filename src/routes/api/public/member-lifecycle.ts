/**
 * Nightly grace-period retention sweep (`/api/public/member-lifecycle`).
 *
 * Called by pg_cron via pg_net with the same server-only cron token as the
 * other scheduled endpoints. It warns lapsing members, closes queue rows for
 * members who returned, and notifies the office about records due for removal.
 * It never deletes anything — anonymisation stays a confirmed staff action.
 *
 * Scheduled as `icf-member-lifecycle-daily` at 04:15 UTC, created with run_sql
 * (not a migration — the command carries environment-specific values). It has
 * the same shape as the other jobs: the token is read from
 * `private.app_config` inside the job command, never inlined.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/member-lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[member-lifecycle] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runLifecycleSweep } = await import("@/lib/member-lifecycle.server");
          const result = await runLifecycleSweep();
          console.log(
            `[member-lifecycle] resolved=${result.resolved} reengagement=${result.queuedReengagement} warned30=${result.warned30} warned7=${result.warned7} due=${result.due} digest=${result.digestSent}`,
          );

          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "sweep threw";
          console.error(`[member-lifecycle] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "sweep failed" }, { status: 500 });
        }
      },
    },
  },
});
