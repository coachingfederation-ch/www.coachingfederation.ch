/**
 * Visitor endpoint for the live volunteer chat (`/api/public/live-chat`).
 *
 * Public because visitors are anonymous. Every action other than `status`
 * requires the opaque conversation key issued at `start`, and all writes are
 * rate-limited per caller. Nothing here returns another visitor's data.
 */
import { createFileRoute } from "@tanstack/react-router";

type Body = Record<string, unknown>;

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const isUuid = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export const Route = createFileRoute("/api/public/live-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const action = str(body["action"], 20);
        const lib = await import("@/lib/live-chat.server");

        if (action === "status") {
          const online = await lib.onlineVolunteerCount();
          return Response.json({ online });
        }

        const { checkRateLimit, clientIp, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );

        if (action === "start") {
          const verdict = await checkRateLimit("live-chat-start", `ip:${clientIp(request)}`, [
            { windowSeconds: 600, max: 5 },
            { windowSeconds: 86_400, max: 30 },
          ]);
          if (!verdict.allowed) return rateLimitResponse(verdict, "Too many requests.");

          const name = str(body["name"], 80);
          const message = str(body["message"], 2000);
          if (!name || !message) return new Response("Missing name or message", { status: 400 });
          if ((await lib.onlineVolunteerCount()) === 0) {
            return Response.json({ error: "offline" }, { status: 409 });
          }
          const email = str(body["email"], 160);
          const started = await lib.startConversation({
            name,
            email: email && /.+@.+\..+/.test(email) ? email : null,
            locale: str(body["locale"], 5) || "en",
            pagePath: str(body["pagePath"], 200) || null,
            message,
          });
          if (!started) return new Response("Could not start the chat", { status: 500 });
          return Response.json(started);
        }

        const conversationId = body["conversationId"];
        const visitorKey = str(body["visitorKey"], 200);
        if (!isUuid(conversationId) || !visitorKey) {
          return new Response("Missing conversation", { status: 400 });
        }
        const id = conversationId as string;

        if (action === "poll") {
          const view = await lib.readConversation(id, visitorKey);
          if (!view) return new Response("Not found", { status: 404 });
          return Response.json(view);
        }

        if (action === "send") {
          const verdict = await checkRateLimit("live-chat-send", `ip:${clientIp(request)}`, [
            { windowSeconds: 60, max: 30 },
            { windowSeconds: 86_400, max: 600 },
          ]);
          if (!verdict.allowed) return rateLimitResponse(verdict, "Too many requests.");
          const text = str(body["body"], 2000);
          if (!text) return new Response("Empty message", { status: 400 });
          const ok = await lib.postVisitorMessage(id, visitorKey, text);
          if (!ok) return new Response("Not found", { status: 404 });
          return new Response(null, { status: 204 });
        }

        if (action === "end") {
          await lib.endConversation(id, visitorKey);
          return new Response(null, { status: 204 });
        }

        return new Response("Unknown action", { status: 400 });
      },
    },
  },
});
