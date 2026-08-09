/**
 * Streaming endpoint for the site assistant.
 *
 * The model, the system prompt and every tool stay here on the server; the
 * browser only sends the conversation. A bearer token is optional: when one is
 * present and verifies, the assistant additionally gets the member-scoped
 * lookup for that user.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { isLocale, type Locale } from "@/i18n/config";
import { CHAPTER_KNOWLEDGE } from "@/lib/assistant/knowledge";

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
};

function systemPrompt(locale: Locale, signedIn: boolean) {
  return `You are the assistant of The Switzerland Chapter of ICF, on its public website.

Answer in ${LANGUAGE_NAMES[locale]} unless the visitor clearly writes in another language, in which case answer in theirs.

Scope: coaching, ICF Credentials, the chapter's coaches, events, Insights articles, local communities, membership, volunteering, and coaching for organisations. If someone asks about anything else, say briefly that you can only help with the chapter and coaching, and offer one useful starting point.

How to answer:
- Use your tools before answering anything about coaches, events, articles or communities. Never answer those from memory.
- Never invent coaches, events, articles, testimonials, statistics, prices or effectiveness claims. If a lookup returns nothing, say so plainly and offer the relevant page or office@coachingfederation.ch.
- Link to real pages using relative markdown links written as [visible label](/path) — the label always comes first and the path always inside the parentheses, for example [Coaching Perspectives Conference 2026](/events/coaching-perspectives-conference-2026). Never write the path as the label. Available paths: /coach/<profile_id>, /events/<slug>, /insights/<id>, /communities/<slug>, /find-a-coach, /for-organisations, /for-coaches.${
    locale === "en"
      ? ""
      : ` Prefix page links with /${locale} (for example /${locale}/find-a-coach), but never prefix a coach, event, insight or community link you were given verbatim by a tool.`
  }
- When you list several events, coaches, articles or communities, use a markdown bullet list with one item per line. For an event, write: "- **[Title](/events/<slug>)** — 17 September 2026, Zürich (in person)". Write dates in a natural long form for the answer language, never as a raw timestamp, and keep each item to one line. Add at most one short closing sentence after the list.
- Be short and warm: two or three sentences, or a short list. Sentence case. Use "we" for the chapter and "you" for the visitor.
- Always write "The Switzerland Chapter of ICF", "ICF Credential" and "credentialed coach". Never "ICF CH", "ICF Switzerland" or "ICF-certified coach".
- When someone is looking for a coach, ask at most one clarifying question (region, language or focus), then search.
- You cannot make bookings, change data, or send messages. Point people to the relevant page or contact address instead.

The visitor is ${signedIn ? "signed in as a member, so you may use get_my_membership for their own chapter context" : "not signed in; membership-specific questions should point to the Member Area sign-in at /member"}.

Chapter knowledge:
${CHAPTER_KNOWLEDGE}`;
}

/** Verifies an optional bearer token and returns the user id when it is valid. */
async function resolveUserId(request: Request): Promise<string | undefined> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) return undefined;

  try {
    const { publicSupabaseClient } = await import("@/lib/supabase-public.server");
    const { data, error } = await publicSupabaseClient().auth.getClaims(token);
    if (error || !data?.claims?.sub) return undefined;
    return data.claims.sub as string;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, clientIp, rateLimitResponse } =
          await import("@/lib/rate-limit.server");

        // The gateway call costs money and needs no account, so the endpoint is
        // capped per caller. Signed-in members get the wider allowance.
        const userId = await resolveUserId(request);
        const subject = userId ? `user:${userId}` : `ip:${clientIp(request)}`;
        const verdict = await checkRateLimit(
          "chat",
          subject,
          userId
            ? [
                { windowSeconds: 300, max: 30 },
                { windowSeconds: 86_400, max: 200 },
              ]
            : [
                { windowSeconds: 300, max: 12 },
                { windowSeconds: 86_400, max: 60 },
              ],
        );
        if (!verdict.allowed) {
          return rateLimitResponse(verdict, "Too many messages. Please try again shortly.");
        }

        const raw = await request.text();
        // ~64 KB is far more than a rolling chat window needs.
        if (raw.length > 64_000) return new Response("Message too large", { status: 413 });

        let body: { messages?: unknown; locale?: unknown };
        try {
          body = JSON.parse(raw) as { messages?: unknown; locale?: unknown };
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        // Keep the context bounded: the widget is a single rolling conversation.
        const messages = (body.messages as UIMessage[]).slice(-24);
        const locale: Locale = isLocale(body.locale) ? body.locale : "en";

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("The assistant is not configured.", { status: 500 });

        const [
          {
            createLovableAiGatewayProvider,
            getLovableAiGatewayRunId,
            getLovableAiGatewayResponseHeaders,
            withLovableAiGatewayRunIdHeader,
          },
          { buildAssistantTools },
        ] = await Promise.all([
          import("@/lib/ai-gateway.server"),
          import("@/lib/assistant/tools.server"),
        ]);

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: systemPrompt(locale, Boolean(userId)),
          messages: await convertToModelMessages(messages),
          tools: buildAssistantTools({ locale, userId }),
          // A genuine answer never needs dozens of tool round-trips; the low cap
          // bounds what one request can spend.
          stopWhen: stepCountIs(8),
          onError: ({ error }) => {
            console.error("[assistant]", error);
          },
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
