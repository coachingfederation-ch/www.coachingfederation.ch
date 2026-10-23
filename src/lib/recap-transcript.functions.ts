/**
 * Drafts an event recap headline and story from a meeting transcript.
 *
 * The transcript is cleaned in the browser (see transcript-clean.ts), used for
 * one AI call and never stored. The result is only a suggestion: applying it
 * to the recap is the editor's decision in EventRecapEditor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { TRANSCRIPT_MAX_CHARS } from "./transcript-clean";

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
  en: "American English",
};

const input = z.object({
  eventId: z.string().uuid(),
  text: z.string().min(1).max(TRANSCRIPT_MAX_CHARS),
  language: z.enum(["de", "fr", "it", "en"]),
});

const draftSchema = z.object({ headline: z.string(), story: z.string() });

const INSTRUCTIONS = [
  "You are the editorial writer of The Switzerland Chapter of ICF. You turn internal meeting notes or transcripts into a public after-event recap.",
  "Headline: short, sentence case, no trailing period.",
  "Story: 3 to 6 short Markdown paragraphs about what the event covered and the key takeaways, warm, professional, first person plural, active voice.",
  "Never include attendee lists, email addresses, links, action items, next steps assigned to people, or internal remarks.",
  "Name people only if they are listed as hosts or speakers in the event context.",
  "Never invent numbers, quotes or claims that are not in the transcript. No em dashes.",
].join("\n");

export const draftRecapFromTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    // Paid AI call: gate and rate-limit before spending credits.
    await assertOrganizer(context);
    const { checkRateLimit } = await import("./rate-limit.server");
    const verdict = await checkRateLimit("recap-transcript", `user:${context.userId}`, [
      { windowSeconds: 3600, max: 20 },
    ]);
    if (!verdict.allowed) throw new Error("Draft limit reached. Please try again in an hour.");

    const { data: event, error } = await context.supabase
      .from("events")
      .select("title, starts_at")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event not found");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI service is not configured");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./ai-gateway.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      output: Output.object({ schema: draftSchema }),
      maxRetries: 0,
      messages: [
        {
          role: "user",
          content: [
            `Write in ${LOCALE_NAMES[data.language]}.`,
            `EVENT: ${(event as { title?: string }).title ?? ""} (${(event as { starts_at?: string }).starts_at ?? ""})`,
            "TRANSCRIPT:",
            data.text,
          ].join("\n"),
        },
      ],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    try {
      const out = (await result.output) as z.infer<typeof draftSchema>;
      const headline = out.headline.trim();
      const story = out.story.trim();
      if (!headline && !story) throw new Error("The AI service returned an empty draft");
      return { headline, story };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) throw new Error("Rate limit reached. Please try again shortly.");
      if (status === 402) throw new Error("AI credits exhausted. Please top up the workspace.");
      if (status === 403) throw new Error("AI access is blocked for this workspace.");
      throw e instanceof Error ? e : new Error(String(e));
    }
  });
