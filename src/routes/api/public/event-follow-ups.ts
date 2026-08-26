/**
 * Scheduled post-event feedback sends (/api/public/event-follow-ups).
 *
 * Called by pg_cron via pg_net every ten minutes. It invites attendees ~15
 * minutes after an event ends and reminds the people who have not answered
 * three days later. Auth is the same server-only cron token the other jobs
 * use — never the publishable key, which ships to every browser.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/event-follow-ups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[event-follow-ups] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const startedAt = Date.now();
        const { runFollowUpSends } = await import("@/lib/event-forms.server");
        try {
          const result = await runFollowUpSends();
          console.log(
            `[event-follow-ups] done invited=${result.invited.sent} reminded=${result.reminded.sent} ms=${Date.now() - startedAt}`,
          );
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "follow-up run threw";
          console.error(`[event-follow-ups] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "follow-up run failed" }, { status: 500 });
        }
      },
    },
  },
});
