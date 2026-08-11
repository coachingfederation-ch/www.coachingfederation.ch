/**
 * AI translation for ticket tier names.
 *
 * Tier names are short labels ("Member ticket", "Early bird"), so this is a
 * single batched call for the whole tier list rather than one call per tier.
 * Nothing is written to the database here: the editor merges the result into
 * its drafts and saves them through `saveEventTiers`, which keeps the
 * translations editable afterwards.
 *
 * Gated on `assertOrganizer` — the same fast-fail used by the event editor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";

const LOCALE_NAMES = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
} as const;

const inputSchema = z.object({
  names: z.array(z.string().trim().min(1)).min(1).max(20),
});

export type TierNameTranslation = { de: string; fr: string; it: string };

export const translateTierNames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<TierNameTranslation[]> => {
    await assertOrganizer(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation service is not configured");

    const prompt = [
      "Translate each English event ticket tier name into " +
        `${LOCALE_NAMES.de}, ${LOCALE_NAMES.fr} and ${LOCALE_NAMES.it}.`,
      "These are short UI labels: keep them short, in sentence case, without trailing punctuation.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC.",
      'Respond with JSON only, in the shape {"items": [{"de": "...", "fr": "...", "it": "..."}]},',
      "with one item per input name, in the same order.",
      "",
      ...data.names.map((name, index) => `${index + 1}. ${name}`),
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional Swiss editorial translator. You reply with JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached — please try again shortly.");
    if (response.status === 402)
      throw new Error("AI credits exhausted — please top up the workspace.");
    if (!response.ok) throw new Error(`Translation service error (${response.status})`);

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    let parsed: { items?: { de?: string; fr?: string; it?: string }[] };
    try {
      parsed = JSON.parse(
        raw
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/, "")
          .trim(),
      );
    } catch {
      throw new Error("Translation service returned an unexpected response");
    }

    const items = parsed.items ?? [];
    // Fall back to the English source so a short reply never blanks a field.
    return data.names.map((name, index) => ({
      de: items[index]?.de?.trim() || name,
      fr: items[index]?.fr?.trim() || name,
      it: items[index]?.it?.trim() || name,
    }));
  });
