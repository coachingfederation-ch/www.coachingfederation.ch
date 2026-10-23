/**
 * Member vote emails (`/api/public/member-votes`).
 *
 * Called hourly by pg_cron with the server-only cron token. Sends each vote's
 * announcement once when it opens and one reminder three days before close.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/member-votes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request, "MEMBER_VOTES_CRON_TOKEN")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { checkRateLimit, rateLimitResponse } = await import("@/lib/rate-limit.server");
        const verdict = await checkRateLimit("member-votes", "cron", [
          { windowSeconds: 3600, max: 6 },
        ]);
        if (!verdict.allowed) return rateLimitResponse(verdict, "Too many vote runs");
        try {
          const { runVoteEmails } = await import("@/lib/votes.server");
          const result = await runVoteEmails();
          console.log(`[member-votes] announced=${result.announced} reminded=${result.reminded}`);
          return Response.json(result);
        } catch (err) {
          console.error("[member-votes] failed", err instanceof Error ? err.message : err);
          return Response.json({ error: "vote emails failed" }, { status: 500 });
        }
      },
    },
  },
});
