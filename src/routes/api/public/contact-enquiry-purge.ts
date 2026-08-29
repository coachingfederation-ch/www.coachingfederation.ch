/**
 * Retention job for contact enquiries (`/api/public/contact-enquiry-purge`).
 *
 * Scheduled daily by pg_cron via pg_net, authenticated with the same
 * server-only cron token as the other scheduled endpoints. Contact enquiries
 * are only a buffer between "send" and the visitor's confirmation click, so
 * every row goes after seven days — confirmed or not.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/contact-enquiry-purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorisedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorisedCronRequest(request)) {
          console.warn("[contact-enquiry-purge] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { purgeContactEnquiries } = await import("@/lib/contact-agent.server");
          const result = await purgeContactEnquiries();
          console.log(`[contact-enquiry-purge] deleted=${result.deleted}`);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "purge threw";
          console.error(`[contact-enquiry-purge] failed error=${JSON.stringify(message)}`);
          return Response.json({ error: "purge failed" }, { status: 500 });
        }
      },
    },
  },
});
