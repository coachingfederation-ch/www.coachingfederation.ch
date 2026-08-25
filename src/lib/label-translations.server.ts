/**
 * Shared AI translation helper for short UI labels (operational-structure
 * names, Insights categories, Coach Finder vocabulary terms).
 *
 * One batched Lovable AI call for a list of English labels rather than one
 * call per row. Nothing is written here: callers patch their rows through
 * their own RLS-scoped client, so table policies stay the real boundary and
 * the labels stay editable afterwards.
 */

const LOCALE_NAMES = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
} as const;

export type LabelTranslation = { de: string; fr: string; it: string };

/**
 * A domain hint sentence pair describing what kind of labels are being
 * translated. Keeps the prompt specific without forking the whole call.
 */
export type LabelDomainHint = string[];

export const OPS_LABEL_HINT: LabelDomainHint = [
  "These are short labels for committees, local communities and board roles",
  "of The Switzerland Chapter of ICF: keep them short, in sentence case,",
  "without trailing punctuation.",
];

export const CATEGORY_LABEL_HINT: LabelDomainHint = [
  "These are short topic category labels for the Insights articles section",
  "of The Switzerland Chapter of ICF: keep them short, in sentence case,",
  "without trailing punctuation.",
];

export const VOCABULARY_LABEL_HINT: LabelDomainHint = [
  "These are directory taxonomy labels used to filter a coach directory —",
  "a region, credential, coaching format, spoken language, specialisation,",
  "client type, experience band, availability or event category. Use the",
  "wording a Swiss coaching directory would use, keep them short, in",
  "sentence case, without trailing punctuation.",
];

/**
 * Translate a batch of English labels. Falls back to the English label per
 * field rather than leaving a gap, because an empty localized label renders
 * as a blank chip on the public site.
 */
export async function translateLabels(
  names: string[],
  hint: LabelDomainHint,
): Promise<LabelTranslation[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Translation service is not configured");

  const prompt = [
    "Translate each English label into " +
      `${LOCALE_NAMES.de}, ${LOCALE_NAMES.fr} and ${LOCALE_NAMES.it}.`,
    ...hint,
    "Do not translate proper nouns such as ICF, ACC, PCC, MCC, DEIB, or Swiss",
    "place names such as Zürich, Basel, Bern, Valais, Lausanne, Genève, Lugano.",
    'Respond with JSON only, in the shape {"items": [{"de": "...", "fr": "...", "it": "..."}]},',
    "with one item per input label, in the same order.",
    "",
    ...names.map((name, index) => `${index + 1}. ${name}`),
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
  return names.map((name, index) => ({
    de: items[index]?.de?.trim() || name,
    fr: items[index]?.fr?.trim() || name,
    it: items[index]?.it?.trim() || name,
  }));
}
