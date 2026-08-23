/**
 * Scheduled attendee reminders (/api/public/event-reminders).
 *
 * Called by pg_cron via pg_net once an hour. Auth is the same server-only
 * cron token the member sync uses — never the publishable key, which ships to
 * every browser and would let anyone trigger a mail run.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/event-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[event-reminders] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const startedAt = Date.now();
        const { runEventReminders } = await import("@/lib/event-reminders.server");
        try {
          const result = await runEventReminders();
          console.log(
            `[event-reminders] done week=${result.stages.week.sent} day=${result.stages.day.sent} ms=${Date.now() - startedAt}`,
          );
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "reminder run threw";
          console.error(`[event-reminders] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "reminder run failed" }, { status: 500 });
        }
      },
    },
  },
});
