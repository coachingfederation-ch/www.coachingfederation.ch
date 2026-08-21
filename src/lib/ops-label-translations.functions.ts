/**
 * AI translation for operational-structure labels (project, community and
 * role names).
 *
 * These are short UI labels, so this is one batched Lovable AI call for a list
 * of English names rather than one call per row — same shape as
 * `translateTierNames`. Nothing is written here: the caller patches the rows
 * through its own RLS-scoped client, which keeps the "admins manage op_*"
 * policies as the real boundary and keeps the labels editable afterwards.
 *
 * Gated on `assertPlatformAdmin` — the same role that may edit the
 * operational structure at all.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";

const LOCALE_NAMES = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
} as const;

const inputSchema = z.object({
  names: z.array(z.string().trim().min(1)).min(1).max(30),
});

export type OpsLabelTranslation = { de: string; fr: string; it: string };

export const translateOpsLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<OpsLabelTranslation[]> => {
    await assertPlatformAdmin(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation service is not configured");

    const prompt = [
      "Translate each English label into " +
        `${LOCALE_NAMES.de}, ${LOCALE_NAMES.fr} and ${LOCALE_NAMES.it}.`,
      "These are short labels for committees, local communities and board roles",
      "of The Switzerland Chapter of ICF: keep them short, in sentence case,",
      "without trailing punctuation.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC, DEIB, or Swiss",
      "place names such as Zürich, Basel, Bern, Valais, Lausanne, Genève, Lugano.",
      'Respond with JSON only, in the shape {"items": [{"de": "...", "fr": "...", "it": "..."}]},',
      "with one item per input label, in the same order.",
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
    // Fall back to the English label rather than leaving a gap: an empty
    // localized label renders as a blank chip on the public team page.
    return data.names.map((name, index) => ({
      de: items[index]?.de?.trim() || name,
      fr: items[index]?.fr?.trim() || name,
      it: items[index]?.it?.trim() || name,
    }));
  });
