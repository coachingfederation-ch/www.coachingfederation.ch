/**
 * Retention job for the role change history (`/api/public/role-grants-archive`).
 *
 * Called nightly by pg_cron via pg_net. Entries older than 24 months are moved
 * into `role_grants_archive`, which is service-role only — the trail is kept
 * for governance requests, just not on screen.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/role-grants-archive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[role-grants-archive] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { archiveOldRoleGrants } = await import("@/lib/roles-admin.server");
          const result = await archiveOldRoleGrants();
          console.log(`[role-grants-archive] archived=${result.archived}`);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "archive threw";
          console.error(`[role-grants-archive] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "archive failed" }, { status: 500 });
        }
      },
    },
  },
});
