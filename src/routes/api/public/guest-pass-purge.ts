/**
 * Retention job for Guest Pass records (`/api/public/guest-pass-purge`).
 *
 * Scheduled daily by pg_cron via pg_net, authenticated with the same
 * server-only cron token as the other scheduled endpoints — never the
 * publishable key. Deletes guest passes 12 months after their event and
 * anonymises the complimentary registration that came with them.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/guest-pass-purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[guest-pass-purge] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { purgeExpiredGuestPasses } = await import("@/lib/guest-passes.server");
          const result = await purgeExpiredGuestPasses();
          console.log(`[guest-pass-purge] deleted=${result.deleted}`);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "purge threw";
          console.error(`[guest-pass-purge] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "purge failed" }, { status: 500 });
        }
      },
    },
  },
});
