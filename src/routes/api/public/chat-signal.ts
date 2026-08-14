/**
 * Records a signal about one assistant answer: the visitor's "was this
 * helpful?" verdict, or a click on the contact address (`/api/public/chat-signal`).
 *
 * Public because the assistant itself is public — there is no session to
 * authenticate. The body carries only an opaque interaction id the browser
 * generated for that turn, so nothing here identifies a person, and an
 * unknown id simply updates nothing. Writes are rate-limited per caller.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/chat-signal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, clientIp, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );
        const verdict = await checkRateLimit("chat-signal", `ip:${clientIp(request)}`, [
          { windowSeconds: 300, max: 60 },
          { windowSeconds: 86_400, max: 400 },
        ]);
        if (!verdict.allowed) return rateLimitResponse(verdict, "Too many requests.");

        let body: { interactionId?: unknown; feedback?: unknown; contactClicked?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const interactionId = typeof body.interactionId === "string" ? body.interactionId : "";
        if (!/^[0-9a-f-]{36}$/i.test(interactionId)) {
          return new Response("Invalid interaction id", { status: 400 });
        }

        const feedback =
          body.feedback === "helpful" || body.feedback === "not_helpful"
            ? body.feedback
            : undefined;

        const { recordChatSignal } = await import("@/lib/assistant/logging.server");
        await recordChatSignal({
          interactionId,
          feedback,
          contactClicked: body.contactClicked === true,
        });

        return new Response(null, { status: 204 });
      },
    },
  },
});
