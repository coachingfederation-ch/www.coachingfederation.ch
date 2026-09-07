/**
 * Machine translation and manual editing of member guide copy.
 *
 * Deliberately close to `event-translations.functions.ts`: same gateway, same
 * prompt shape, same "one row per (entity, locale)" storage, so editors meet
 * one translation model across the CMS. A guide travels as one document —
 * guide-level copy plus every section, its callouts and its questions — so the
 * model keeps the tone consistent across the whole page.
 *
 * The flat field keys (`title`, `s<n>_heading`, `s<n>_c<m>_body`,
 * `s<n>_q<m>_answer`, …) are what the shared translation panel edits; they are
 * mapped back onto the four translation tables on save.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEditor } from "./authz";

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
};

const GUIDE_FIELDS = ["title", "summary", "eyebrow", "intro", "footnote"] as const;
const SECTION_FIELDS = ["eyebrow", "heading", "lead", "body"] as const;
const CALLOUT_FIELDS = ["label", "body"] as const;
const FAQ_FIELDS = ["question", "answer", "quote"] as const;

export type GuideTranslationRow = {
  locale: string;
  manually_edited: boolean;
  source_updated_at: string;
} & Record<string, string | boolean | null>;

type CalloutRow = { id: string; position: number; label: string; body: string };
type FaqRow = { id: string; position: number; question: string; answer: string; quote: string };

type SectionRow = {
  id: string;
  position: number;
  eyebrow: string;
  heading: string;
  lead: string;
  body: string;
  guide_section_callouts?: CalloutRow[] | null;
  guide_faq_items?: FaqRow[] | null;
};

/** Shape the CMS passes so the panel knows which keys exist. */
export type GuideTranslationShape = { callouts: number; faq: number }[];

/** Field keys the translation panel edits, derived from the section order. */
export function guideTranslationFieldKeys(shape: GuideTranslationShape): string[] {
  const keys: string[] = [...GUIDE_FIELDS];
  shape.forEach((section, i) => {
    for (const field of SECTION_FIELDS) keys.push(`s${i}_${field}`);
    for (let c = 0; c < section.callouts; c += 1) {
      for (const field of CALLOUT_FIELDS) keys.push(`s${i}_c${c}_${field}`);
    }
    for (let q = 0; q < section.faq; q += 1) {
      for (const field of FAQ_FIELDS) keys.push(`s${i}_q${q}_${field}`);
    }
  });
  return keys;
}

const sorted = <T extends { position: number }>(rows: T[] | null | undefined): T[] =>
  (rows ?? []).slice().sort((a, b) => a.position - b.position);

async function loadSource(
  supabase: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  guideId: string,
) {
  const { data: guide, error } = await supabase
    .from("guides")
    .select("id, title, summary, eyebrow, intro, footnote, content_updated_at")
    .eq("id", guideId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!guide) throw new Error("Guide not found");
  const { data: sections, error: sectionError } = await supabase
    .from("guide_sections")
    .select(
      "id, position, eyebrow, heading, lead, body, guide_section_callouts(id, position, label, body), guide_faq_items(id, position, question, answer, quote)",
    )
    .eq("guide_id", guideId)
    .order("position", { ascending: true });
  if (sectionError) throw new Error(sectionError.message);
  return { guide, sections: (sections ?? []) as SectionRow[] };
}

export const loadGuideTranslations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ guideId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<GuideTranslationRow[]> => {
    await assertEditor(context);
    const { sections } = await loadSource(context.supabase, data.guideId);

    const { data: guideRows, error } = await context.supabase
      .from("guide_translations")
      .select(
        "locale, title, summary, eyebrow, intro, footnote, manually_edited, source_updated_at",
      )
      .eq("guide_id", data.guideId);
    if (error) throw new Error(error.message);

    const sectionIds = sections.map((s) => s.id);
    const { data: sectionRows, error: sectionError } = sectionIds.length
      ? await context.supabase
          .from("guide_section_translations")
          .select("section_id, locale, eyebrow, heading, lead, body")
          .in("section_id", sectionIds)
      : { data: [], error: null };
    if (sectionError) throw new Error(sectionError.message);

    const calloutIds = sections.flatMap((s) => sorted(s.guide_section_callouts).map((c) => c.id));
    const { data: calloutRows } = calloutIds.length
      ? await context.supabase
          .from("guide_callout_translations")
          .select("callout_id, locale, label, body")
          .in("callout_id", calloutIds)
      : { data: [] };

    const faqIds = sections.flatMap((s) => sorted(s.guide_faq_items).map((f) => f.id));
    const { data: faqRows } = faqIds.length
      ? await context.supabase
          .from("guide_faq_item_translations")
          .select("item_id, locale, question, answer, quote")
          .in("item_id", faqIds)
      : { data: [] };

    return ((guideRows ?? []) as Record<string, unknown>[]).map((row) => {
      const merged: GuideTranslationRow = {
        locale: String(row.locale),
        manually_edited: Boolean(row.manually_edited),
        source_updated_at: String(row.source_updated_at),
      };
      for (const field of GUIDE_FIELDS) merged[field] = (row[field] as string | null) ?? "";
      sections.forEach((section, index) => {
        const st = ((sectionRows ?? []) as Record<string, unknown>[]).find(
          (s) => s.section_id === section.id && s.locale === row.locale,
        );
        for (const field of SECTION_FIELDS) {
          merged[`s${index}_${field}`] = ((st?.[field] as string | null) ?? "") || "";
        }
        sorted(section.guide_section_callouts).forEach((callout, c) => {
          const ct = ((calloutRows ?? []) as Record<string, unknown>[]).find(
            (r) => r.callout_id === callout.id && r.locale === row.locale,
          );
          for (const field of CALLOUT_FIELDS) {
            merged[`s${index}_c${c}_${field}`] = ((ct?.[field] as string | null) ?? "") || "";
          }
        });
        sorted(section.guide_faq_items).forEach((item, q) => {
          const it = ((faqRows ?? []) as Record<string, unknown>[]).find(
            (r) => r.item_id === item.id && r.locale === row.locale,
          );
          for (const field of FAQ_FIELDS) {
            merged[`s${index}_q${q}_${field}`] = ((it?.[field] as string | null) ?? "") || "";
          }
        });
      });
      return merged;
    });
  });

export const saveGuideTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        guideId: z.string().uuid(),
        locale: z.enum(["de", "fr", "it"]),
        values: z.record(z.string(), z.string().nullable()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ error: string | null }> => {
    await assertEditor(context);
    const { guide, sections } = await loadSource(context.supabase, data.guideId);
    const sourceUpdatedAt = String(
      (guide as { content_updated_at: string }).content_updated_at ?? new Date().toISOString(),
    );
    const text = (key: string) => (data.values[key] ?? "").trim();

    const { error } = await context.supabase.from("guide_translations").upsert(
      {
        guide_id: data.guideId,
        locale: data.locale,
        title: text("title"),
        summary: text("summary"),
        eyebrow: text("eyebrow"),
        intro: text("intro"),
        footnote: text("footnote"),
        manually_edited: true,
        source_updated_at: sourceUpdatedAt,
      },
      { onConflict: "guide_id,locale" },
    );
    if (error) return { error: error.message };

    if (sections.length > 0) {
      const rows = sections.map((section, index) => ({
        section_id: section.id,
        locale: data.locale,
        eyebrow: text(`s${index}_eyebrow`),
        heading: text(`s${index}_heading`),
        lead: text(`s${index}_lead`),
        body: text(`s${index}_body`),
        manually_edited: true,
        source_updated_at: sourceUpdatedAt,
      }));
      const { error: sectionError } = await context.supabase
        .from("guide_section_translations")
        .upsert(rows, { onConflict: "section_id,locale" });
      if (sectionError) return { error: sectionError.message };
    }

    const calloutRows = sections.flatMap((section, index) =>
      sorted(section.guide_section_callouts).map((callout, c) => ({
        callout_id: callout.id,
        locale: data.locale,
        label: text(`s${index}_c${c}_label`),
        body: text(`s${index}_c${c}_body`),
        manually_edited: true,
        source_updated_at: sourceUpdatedAt,
      })),
    );
    if (calloutRows.length > 0) {
      const { error: calloutError } = await context.supabase
        .from("guide_callout_translations")
        .upsert(calloutRows, { onConflict: "callout_id,locale" });
      if (calloutError) return { error: calloutError.message };
    }

    const faqRows = sections.flatMap((section, index) =>
      sorted(section.guide_faq_items).map((item, q) => ({
        item_id: item.id,
        locale: data.locale,
        question: text(`s${index}_q${q}_question`),
        answer: text(`s${index}_q${q}_answer`),
        quote: text(`s${index}_q${q}_quote`),
        manually_edited: true,
        source_updated_at: sourceUpdatedAt,
      })),
    );
    if (faqRows.length > 0) {
      const { error: faqError } = await context.supabase
        .from("guide_faq_item_translations")
        .upsert(faqRows, { onConflict: "item_id,locale" });
      if (faqError) return { error: faqError.message };
    }

    return { error: null };
  });

export const translateGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ guideId: z.string().uuid(), locale: z.enum(["de", "fr", "it"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Paid AI call: gate before touching the gateway.
    await assertEditor(context);
    const { guide, sections } = await loadSource(context.supabase, data.guideId);
    const source = guide as Record<string, string>;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation service is not configured");

    const document = {
      title: source.title ?? "",
      summary: source.summary ?? "",
      eyebrow: source.eyebrow ?? "",
      intro: source.intro ?? "",
      footnote: source.footnote ?? "",
      sections: sections.map((s) => ({
        eyebrow: s.eyebrow,
        heading: s.heading,
        lead: s.lead,
        body: s.body,
        callouts: sorted(s.guide_section_callouts).map((c) => ({ label: c.label, body: c.body })),
        faq: sorted(s.guide_faq_items).map((f) => ({
          question: f.question,
          answer: f.answer,
          quote: f.quote,
        })),
      })),
    };

    const prompt = [
      `Translate the following guideline document from English into ${LOCALE_NAMES[data.locale]}.`,
      "Keep Markdown formatting, bullet lists and paragraph structure exactly as they are.",
      "Use a warm, clear, professional tone suitable for The Switzerland Chapter of ICF.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC, LinkedIn, or e-mail addresses.",
      "Keep every array (sections, callouts, faq) in the same order and with the same number of entries.",
      "Respond with JSON only, in exactly the same shape as the input.",
      "",
      JSON.stringify(document),
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
    let parsed: typeof document;
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

    const sourceUpdatedAt = String(source.content_updated_at ?? new Date().toISOString());
    const clean = (value: unknown, fallback: string) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      return trimmed.length > 0 ? trimmed : fallback;
    };
    const now = new Date().toISOString();

    const { error } = await context.supabase.from("guide_translations").upsert(
      {
        guide_id: data.guideId,
        locale: data.locale,
        title: clean(parsed.title, source.title ?? ""),
        summary: clean(parsed.summary, ""),
        eyebrow: clean(parsed.eyebrow, ""),
        intro: clean(parsed.intro, ""),
        footnote: clean(parsed.footnote, ""),
        manually_edited: false,
        source_updated_at: sourceUpdatedAt,
        updated_at: now,
      },
      { onConflict: "guide_id,locale" },
    );
    if (error) throw new Error(error.message);

    const translatedSections = Array.isArray(parsed.sections) ? parsed.sections : [];

    if (sections.length > 0) {
      const rows = sections.map((section, index) => {
        const t = translatedSections[index] ?? ({} as (typeof document.sections)[number]);
        return {
          section_id: section.id,
          locale: data.locale,
          eyebrow: clean(t.eyebrow, ""),
          heading: clean(t.heading, ""),
          lead: clean(t.lead, ""),
          body: clean(t.body, ""),
          manually_edited: false,
          source_updated_at: sourceUpdatedAt,
          updated_at: now,
        };
      });
      const { error: sectionError } = await context.supabase
        .from("guide_section_translations")
        .upsert(rows, { onConflict: "section_id,locale" });
      if (sectionError) throw new Error(sectionError.message);
    }

    const calloutRows = sections.flatMap((section, index) => {
      const translated = translatedSections[index]?.callouts ?? [];
      return sorted(section.guide_section_callouts).map((callout, c) => ({
        callout_id: callout.id,
        locale: data.locale,
        label: clean(translated[c]?.label, ""),
        body: clean(translated[c]?.body, ""),
        manually_edited: false,
        source_updated_at: sourceUpdatedAt,
        updated_at: now,
      }));
    });
    if (calloutRows.length > 0) {
      const { error: calloutError } = await context.supabase
        .from("guide_callout_translations")
        .upsert(calloutRows, { onConflict: "callout_id,locale" });
      if (calloutError) throw new Error(calloutError.message);
    }

    const faqRows = sections.flatMap((section, index) => {
      const translated = translatedSections[index]?.faq ?? [];
      return sorted(section.guide_faq_items).map((item, q) => ({
        item_id: item.id,
        locale: data.locale,
        question: clean(translated[q]?.question, ""),
        answer: clean(translated[q]?.answer, ""),
        quote: clean(translated[q]?.quote, ""),
        manually_edited: false,
        source_updated_at: sourceUpdatedAt,
        updated_at: now,
      }));
    });
    if (faqRows.length > 0) {
      const { error: faqError } = await context.supabase
        .from("guide_faq_item_translations")
        .upsert(faqRows, { onConflict: "item_id,locale" });
      if (faqError) throw new Error(faqError.message);
    }

    return { ok: true };
  });
