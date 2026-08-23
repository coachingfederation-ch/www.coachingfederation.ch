/**
 * Scheduled newsletter maintenance (/api/public/newsletter-refresh).
 *
 * Called by pg_cron: monthly to create the next edition, weekly on Friday to
 * regenerate the AI blocks whose sources moved, and to publish editions whose
 * scheduled time has passed. Auth is the server-only cron token — never the
 * publishable key, which would let anyone burn AI credits.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/newsletter-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request, "NEWSLETTER_CRON_TOKEN")) {
          console.warn("[newsletter] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") ?? "refresh";
        const jobs = await import("@/lib/newsletter-jobs.server");
        const startedAt = Date.now();
        try {
          if (mode === "create") {
            const result = await jobs.ensureCurrentEdition();
            console.log(`[newsletter] create id=${result.id} created=${result.created}`);
            return Response.json(result);
          }
          const published = await jobs.publishDueEditions();
          const refresh = await jobs.runWeeklyRefresh();
          console.log(
            `[newsletter] refresh id=${refresh.newsletterId} changed=${refresh.changed} ` +
              `published=${published} ms=${Date.now() - startedAt}`,
          );
          return Response.json({ ...refresh, published });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Newsletter job threw";
          console.error(`[newsletter] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
