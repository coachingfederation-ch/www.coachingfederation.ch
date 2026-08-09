/**
 * API route for ICF member synchronization (/api/public/member-sync).
 * Exports: Route. Handles POST requests from cron to sync member data with the master ICF feed.
 */

import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled member sync endpoint, called by pg_cron via pg_net.
 *
 * Auth is a dedicated server-only token (`MEMBER_SYNC_CRON_TOKEN`) sent in the
 * `x-cron-token` header. It must NOT be the Supabase publishable key: that key
 * ships to every browser, so anyone could have triggered a full ICF sync run
 * (burning SOAP quota, racing an in-flight cutover, spamming the audit log).
 * The cron job reads the same token from `private.app_config`, so the value
 * lives only in server env + the database, never in the repo or the client.
 *
 * It never runs while a cutover is in progress.
 */
export const Route = createFileRoute("/api/public/member-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          // Never log the token itself — only that a call was rejected.
          console.warn("[member-sync] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const startedAt = Date.now();
        console.log("[member-sync] start trigger=cron");

        const { loadIntegrationConfigAdmin } = await import("@/lib/integration-config.server");
        const config = await loadIntegrationConfigAdmin();
        if (config.cutover_in_progress) {
          console.log("[member-sync] skipped reason=cutover_in_progress");
          return Response.json({ skipped: "cutover_in_progress" }, { status: 202 });
        }

        const { runMemberSync } = await import("@/lib/member-sync.server");
        try {
          const result = await runMemberSync({ triggerSource: "cron" });
          const line =
            `[member-sync] done status=${result.status} run=${result.runId} ` +
            `feed=${result.feedCount} created=${result.created} updated=${result.updated} ` +
            `deactivated=${result.deactivated} ms=${Date.now() - startedAt}`;
          if (result.status === "succeeded") console.log(line);
          else console.error(`${line} error=${JSON.stringify(result.message ?? "")}`);
          return Response.json(result, { status: result.status === "succeeded" ? 200 : 500 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "member sync threw";
          console.error(
            `[member-sync] failed ms=${Date.now() - startedAt} error=${JSON.stringify(message)}`,
          );
          throw err;
        }
      },
    },
  },
});
