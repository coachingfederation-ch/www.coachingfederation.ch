/**
 * AI translation for a whole event questionnaire.
 *
 * Deliberately mirrors `tier-translations.functions.ts`: one batched gateway
 * call for the entire form (intro, thank-you, and every question's label,
 * help text, answer options and rating scale labels), nothing written to the
 * database. The editor merges the result into its drafts and saves through
 * `saveEventForm`, so every machine translation stays editable afterwards.
 *
 * Gated on `assertOrganizer` — a paid call must never be reachable by an
 * account without event rights.
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

const questionSchema = z.object({
  label: z.string().trim().max(300),
  help: z.string().trim().max(500).nullable().optional(),
  options: z.array(z.string().trim().max(200)).max(20),
  scaleLow: z.string().trim().max(60).nullable().optional(),
  scaleHigh: z.string().trim().max(60).nullable().optional(),
});

const inputSchema = z.object({
  intro: z.string().trim().max(1000).nullable().optional(),
  thankYou: z.string().trim().max(1000).nullable().optional(),
  questions: z.array(questionSchema).max(40),
});

type LocaleKey = keyof typeof LOCALE_NAMES;

export type QuestionTranslation = {
  label: string;
  help: string | null;
  options: string[];
  scaleLow: string | null;
  scaleHigh: string | null;
};

export type FormTranslation = {
  intro: string | null;
  thankYou: string | null;
  questions: QuestionTranslation[];
};

export type FormTranslations = Record<LocaleKey, FormTranslation>;

export const translateEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<FormTranslations> => {
    await assertOrganizer(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation service is not configured");

    const source = {
      intro: data.intro ?? "",
      thankYou: data.thankYou ?? "",
      questions: data.questions.map((q) => ({
        label: q.label,
        help: q.help ?? "",
        options: q.options,
        scaleLow: q.scaleLow ?? "",
        scaleHigh: q.scaleHigh ?? "",
      })),
    };

    const prompt = [
      "Translate this English event registration questionnaire into " +
        `${LOCALE_NAMES.de}, ${LOCALE_NAMES.fr} and ${LOCALE_NAMES.it}.`,
      "These are form labels, help texts, answer options and rating scale endpoints:",
      "keep them short, in sentence case, and keep every list in the same order and length.",
      "Return an empty string wherever the source is empty.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC, Zürich, Lausanne, Lugano.",
      "Respond with JSON only, in the shape",
      '{"de": {"intro": "...", "thankYou": "...", "questions": [{"label": "...", "help": "...", "options": ["..."], "scaleLow": "...", "scaleHigh": "..."}]}, "fr": {...}, "it": {...}}',
      "with one question entry per input question, in the same order.",
      "",
      JSON.stringify(source),
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
    let parsed: Partial<Record<LocaleKey, FormTranslation>>;
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

    const clean = (value: unknown, fallback: string): string | null => {
      const text = typeof value === "string" ? value.trim() : "";
      const result = text || fallback;
      return result ? result : null;
    };

    // Fall back to the English source per field, so a short or partial reply
    // degrades to the source wording instead of blanking a question.
    const build = (locale: LocaleKey): FormTranslation => {
      const got = parsed[locale];
      return {
        intro: clean(got?.intro, source.intro),
        thankYou: clean(got?.thankYou, source.thankYou),
        questions: source.questions.map((question, index) => {
          const q = got?.questions?.[index];
          const options = Array.isArray(q?.options) ? q.options : [];
          return {
            label: clean(q?.label, question.label) ?? question.label,
            help: clean(q?.help, question.help),
            // Length mismatch means the mapping is untrustworthy: keep English.
            options:
              options.length === question.options.length
                ? question.options.map(
                    (value, i) => (options[i] ?? "").toString().trim() || value,
                  )
                : question.options,
            scaleLow: clean(q?.scaleLow, question.scaleLow),
            scaleHigh: clean(q?.scaleHigh, question.scaleHigh),
          };
        }),
      };
    };

    return { de: build("de"), fr: build("fr"), it: build("it") };
  });
