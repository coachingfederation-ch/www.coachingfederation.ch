/**
 * Retention job for live chat transcripts (`/api/public/live-chat-purge`).
 *
 * Called by pg_cron via pg_net. Authenticated with the same server-only cron
 * token as the other scheduled endpoints — never the publishable key.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/live-chat-purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[live-chat-purge] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { purgeOldConversations } = await import("@/lib/live-chat.server");
          const result = await purgeOldConversations();
          console.log(`[live-chat-purge] deleted=${result.deleted}`);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "purge threw";
          console.error(`[live-chat-purge] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "purge failed" }, { status: 500 });
        }
      },
    },
  },
});
