/**
 * Streaming endpoint for the internal staff support agent.
 *
 * Staff only: a valid bearer token is required and the caller must hold a
 * staff role. The route guard on `_staff` is navigation hygiene; this check is
 * the boundary. The agent explains and reads — it has no write tool at all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { isLocale, type Locale } from "@/i18n/config";
import { screenFor, staffScreenMap } from "@/lib/assistant/staff-help";

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
};

type ScreenContext = { path: string; recordKind?: string; recordId?: string };

function systemPrompt(locale: Locale, context: ScreenContext) {
  const screen = screenFor(context.path);
  const record =
    context.recordId && context.recordKind
      ? `They currently have a ${context.recordKind} open with id ${context.recordId}. When the question is about "this ${context.recordKind}", call describe_open_record with that kind and id before answering.`
      : "No single record is open right now.";

  return `You are the support agent inside the internal CMS of The Switzerland Chapter of ICF. You help the team — editors, event organizers, membership & engagement, administrators — get their work done in these screens.

Answer in ${LANGUAGE_NAMES[locale]} unless the person clearly writes in another language.

What you do:
- Explain how a screen works, what an option means, and above all what its consequences are: what changes on the public site, who can see it afterwards, what becomes irreversible.
- Call search_staff_help before answering anything about how something works, and answer from what it returns. Use explain_screen to point someone to the right screen. Never invent behaviour that neither the help library nor the open record supports — say plainly that you are not sure and name the screen or office@coachingfederation.ch instead.
- Be concrete about the record in front of them when there is one: "this event is members only, so it is not in the public list".

What you never do:
- You cannot change, publish, send, delete or fix anything. You have no write tools. When asked to act, explain exactly where and how to do it themselves.
- Never repeat member personal data: no attendee names, private emails, phone numbers or ICF member numbers. Talk in counts and settings.
- Never guess at credentials, prices, legal or membership rules.

Style: short and warm, two or three sentences or a short list, sentence case, "we" for the chapter and "you" for the reader. Write "The Switzerland Chapter of ICF", "ICF Credential" and "credentialed coach" — never "ICF CH", "ICF Switzerland" or "ICF-certified coach". Link to internal screens as relative markdown links written as [label](/path).

Current screen: ${screen ? `${screen.prefix} — ${screen.title}. ${screen.summary}` : context.path}
${record}

Internal screens:
${staffScreenMap()}`;
}

/** Verifies the bearer token and confirms the caller holds a staff role. */
async function resolveStaffUser(
  request: Request,
): Promise<{ userId: string; token: string } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) return null;

  try {
    const { publicSupabaseClient } = await import("@/lib/supabase-public.server");
    const anon = publicSupabaseClient();
    const { data, error } = await anon.auth.getClaims(token);
    const userId = data?.claims?.sub as string | undefined;
    if (error || !userId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const staffRoles = new Set([
      "admin",
      "administrator",
      "editor",
      "organizer",
      "publisher",
      "membership",
      "contributor",
    ]);
    if (!(roles ?? []).some((r) => staffRoles.has(r.role as string))) return null;
    return { userId, token };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/staff-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const staff = await resolveStaffUser(request);
        if (!staff) return new Response("Unauthorized", { status: 401 });

        const { checkRateLimit, rateLimitResponse } = await import("@/lib/rate-limit.server");
        const verdict = await checkRateLimit("staff-assistant", `user:${staff.userId}`, [
          { windowSeconds: 300, max: 40 },
          { windowSeconds: 86_400, max: 400 },
        ]);
        if (!verdict.allowed) {
          return rateLimitResponse(verdict, "Too many messages. Please try again shortly.");
        }

        const raw = await request.text();
        if (raw.length > 64_000) return new Response("Message too large", { status: 413 });

        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const messages = (body.messages as UIMessage[]).slice(-24);
        const locale: Locale = isLocale(body.locale) ? body.locale : "en";
        const context: ScreenContext = {
          path: typeof body.path === "string" ? body.path.slice(0, 200) : "/manage",
          recordKind:
            body.recordKind === "event" || body.recordKind === "article" ||
            body.recordKind === "newsletter"
              ? body.recordKind
              : undefined,
          recordId:
            typeof body.recordId === "string" && /^[0-9a-z-]{6,64}$/i.test(body.recordId)
              ? body.recordId
              : undefined,
        };

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("The assistant is not configured.", { status: 500 });

        const [
          {
            createLovableAiGatewayProvider,
            getLovableAiGatewayRunId,
            getLovableAiGatewayResponseHeaders,
            withLovableAiGatewayRunIdHeader,
          },
          { buildStaffAssistantTools },
        ] = await Promise.all([
          import("@/lib/ai-gateway.server"),
          import("@/lib/assistant/staff-tools.server"),
        ]);

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.7-flash"),
          system: systemPrompt(locale, context),
          messages: await convertToModelMessages(messages),
          tools: buildStaffAssistantTools({ accessToken: staff.token }),
          stopWhen: stepCountIs(8),
          abortSignal: request.signal,
          onError: ({ error }) => {
            console.error("[staff-assistant]", error);
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
