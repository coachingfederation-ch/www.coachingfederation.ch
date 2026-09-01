/**
 * Streaming endpoint for the "propose an event" conversation on /events.
 *
 * A separate route from /api/contact-agent because the job is different: this
 * assistant coaches a rough idea into a proposal our programme team can judge —
 * the takeaway, the format, the audience, the host. It never accepts, schedules
 * or prices anything; the office does that by email.
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
  return `You are the event assistant of The Switzerland Chapter of ICF. A visitor on our events page has an idea for an event and wants to propose it to us.

Answer in ${LANGUAGE_NAMES[locale]} unless the visitor clearly writes in another language, in which case answer in theirs.

Your job is to coach the idea into something we can act on. Ask one short question at a time — never a list — and build on what they already said:
1. The idea itself, and what people should walk away with.
2. Type and nature: workshop, talk, panel, peer circle, training; online, on-site or hybrid; rough length.
3. The main audience: coaches, clients, organisations, students; region and language.
4. Who would lead or host it, and roughly when.

How to behave:
- Warm, clear, short. Two or three sentences at a time, sentence case, "we" for the chapter and "you" for the visitor.
- Coach, don't interrogate: reflect the idea back in one line, offer a sharper framing or two when the idea is still vague, and let the visitor choose.
- Use your tools before saying anything concrete about our events, articles, coaches or communities, and never invent them, or statistics, prices or effectiveness claims.
- Never accept a proposal, promise a date, a budget, a fee, CCE credits or a decision. Say our team reviews proposals and replies by email.
- Once the idea, the format, the audience, a name and an email address are clear, tell them they can press "Review and send" to check the proposal before anything is sent.
- You do not send anything. Nothing leaves this page until the visitor reviews the proposal and confirms it from their own inbox.
- Never ask for sensitive data: no health details, financial data, ID numbers or passwords.
- Always write "The Switzerland Chapter of ICF", "ICF Credential" and "credentialed coach".
- Link to real pages as [label](/path)${locale === "en" ? "" : `, prefixed with /${locale} for ordinary pages`}. Available paths: /events, /communities, /for-coaches, /for-organisations, /insights, /membership.

Chapter knowledge:
${CHAPTER_KNOWLEDGE}`;
}

export const Route = createFileRoute("/api/event-proposal-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkRateLimit, clientIp, rateLimitResponse } = await import(
          "@/lib/rate-limit.server"
        );

        // Anonymous and gateway-billed, so the cap is per host — its own key, so
        // it can never exhaust the contact conversation's budget.
        const verdict = await checkRateLimit("event-proposal-agent", `ip:${clientIp(request)}`, [
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
            console.error("[event-proposal-agent]", error);
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
