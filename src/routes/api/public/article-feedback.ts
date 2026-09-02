/**
 * Reader feedback on one published article (`/api/public/article-feedback`).
 *
 * Public because readers are not signed in. Nothing here can read data back:
 * the route only inserts, and the `article_feedback` table grants `anon` an
 * INSERT and nothing else. The caller's IP is hashed before storage and used
 * only for abuse control, and the email field is optional and reader-supplied.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  DIAL_MAX,
  DIAL_MIN,
  MAX_COMMENT_LENGTH,
  MAX_TOPICS,
  MAX_TOPIC_LENGTH,
} from "@/lib/article-feedback";

const bodySchema = z.object({
  articleId: z.string().uuid(),
  locale: z.string().max(8).default("en"),
  depth: z.number().int().min(DIAL_MIN).max(DIAL_MAX),
  usefulness: z.number().int().min(DIAL_MIN).max(DIAL_MAX),
  topics: z.array(z.string().trim().min(1).max(MAX_TOPIC_LENGTH)).max(MAX_TOPICS).default([]),
  comment: z.string().trim().max(MAX_COMMENT_LENGTH).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  /** Honeypot: a real reader never fills this in. */
  website: z.string().max(200).optional(),
});

export const Route = createFileRoute("/api/public/article-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, clientIp, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );
        const ip = clientIp(request);
        const verdict = await checkRateLimit("article-feedback", `ip:${ip}`, [
          { windowSeconds: 3_600, max: 10 },
          { windowSeconds: 86_400, max: 30 },
        ]);
        if (!verdict.allowed) {
          return rateLimitResponse(verdict, "Thanks — that is enough feedback for now.");
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) return new Response("Invalid feedback", { status: 400 });
        const body = parsed.data;
        // A filled honeypot is a bot: answer 204 so it learns nothing.
        if (body.website && body.website.trim()) return new Response(null, { status: 204 });

        const { recordArticleFeedback } = await import("@/lib/article-feedback.server");
        const stored = await recordArticleFeedback(body, ip);
        if (!stored) return new Response("Could not store feedback", { status: 400 });

        return new Response(null, { status: 204 });
      },
    },
  },
});
