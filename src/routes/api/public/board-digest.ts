/**
 * Board digest scheduler (`/api/public/board-digest`).
 *
 * Called hourly by pg_cron with the server-only cron token. The handler sends
 * only when the configured Zurich weekday/hour matches and the cadence has
 * elapsed (see `isDigestDue`); every other call is a cheap no-op. The send
 * goes to the single configured board address only.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/board-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request, "BOARD_DIGEST_CRON_TOKEN")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { checkRateLimit, rateLimitResponse } = await import("@/lib/rate-limit.server");
        const verdict = await checkRateLimit("board-digest", "cron", [
          { windowSeconds: 3600, max: 6 },
        ]);
        if (!verdict.allowed) return rateLimitResponse(verdict, "Too many digest runs");
        try {
          const { runScheduledDigest } = await import("@/lib/board-digest.server");
          const result = await runScheduledDigest();
          console.log(`[board-digest] due=${result.due} sent=${result.sent ?? false}`);
          return Response.json({ due: result.due, sent: result.sent ?? false });
        } catch (err) {
          console.error("[board-digest] failed", err instanceof Error ? err.message : err);
          return Response.json({ error: "digest failed" }, { status: 500 });
        }
      },
    },
  },
});
