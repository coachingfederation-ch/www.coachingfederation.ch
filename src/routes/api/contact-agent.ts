/**
 * Streaming endpoint for the contact conversation on /about.
 *
 * A separate route from /api/chat on purpose: this assistant has a different
 * job (understand the enquiry well enough that the office can act on it) and a
 * tighter rate limit, because every conversation here can end in outbound mail.
 * It answers from chapter knowledge where it can, but never promises a reply
 * itself — the office does that.
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

function systemPrompt(locale: Locale) {
  return `You are the contact assistant of The Switzerland Chapter of ICF. A visitor is on the contact section of our About page and wants to reach us.

Answer in ${LANGUAGE_NAMES[locale]} unless the visitor clearly writes in another language, in which case answer in theirs.

Your job, in this order:
1. Understand what they need. Ask one short question at a time — never a list of questions.
2. If our own pages already answer it, say so in one or two sentences and link the page. Then ask whether they still want to write to our office.
3. Collect what the office needs to reply well: what they are asking for, any context that matters (organisation, region, timing), their name, and their email address.
4. Once you have the request, a name and an email address, tell them they can press "Review and send" to check the message before anything is sent. Do not repeat the whole summary yourself.

How to behave:
- Warm, clear, short. Two or three sentences at a time, sentence case, "we" for the chapter and "you" for the visitor.
- Use your tools before saying anything concrete about coaches, events, articles or communities, and never invent them, or statistics, prices or effectiveness claims.
- Never promise a deadline, a price, a decision or a person. Say that our office will reply by email.
- You do not send anything. Nothing leaves this page until the visitor reviews the message and confirms it from their own inbox — say so if they ask.
- Never ask for sensitive data: no health details, financial data, ID numbers or passwords. If someone starts sharing them, gently say it is not needed here.
- Always write "The Switzerland Chapter of ICF", "ICF Credential" and "credentialed coach".
- Link to real pages as [label](/path)${locale === "en" ? "" : `, prefixed with /${locale} for ordinary pages`}. Available paths: /find-a-coach, /for-organisations, /for-coaches, /events, /insights, /communities, /membership.

Chapter knowledge:
${CHAPTER_KNOWLEDGE}`;
}

export const Route = createFileRoute("/api/contact-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, clientIp, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );

        // Anonymous and gateway-billed, so the cap is per host and deliberately
        // tighter than the general site assistant.
        const verdict = await checkRateLimit("contact-agent", `ip:${clientIp(request)}`, [
          { windowSeconds: 300, max: 12 },
          { windowSeconds: 86_400, max: 60 },
        ]);
        if (!verdict.allowed) {
          return rateLimitResponse(verdict, "Too many messages. Please try again shortly.");
        }

        const raw = await request.text();
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
          system: systemPrompt(locale),
          messages: await convertToModelMessages(messages),
          tools: buildAssistantTools({ locale }),
          stopWhen: stepCountIs(6),
          onError: ({ error }) => {
            console.error("[contact-agent]", error);
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
