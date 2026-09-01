/**
 * Machine translation for one newsletter edition (staff only).
 *
 * Deliberately a near-copy of `event-translations.functions.ts`: same gateway,
 * same prompt shape, same upsert-on-(id, locale) storage, so editors meet one
 * translation model across the CMS. English is the source; the edition title
 * and mail subject travel together with every enabled block, one gateway call
 * per block so a long edition never becomes one oversized request.
 *
 * Exports: translateNewsletter. Used by the newsletter translations panel.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff, type AuthedContext } from "./authz";

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
  en: "English",
};

const inputSchema = z.object({
  id: z.string().uuid(),
  locale: z.enum(["de", "fr", "it"]),
});

const SYSTEM =
  "You are a professional Swiss editorial translator for the International Coaching Federation. You reply with JSON only.";

/** One gateway round trip. Returns the parsed JSON object the prompt asked for. */
async function translateJson(apiKey: string, prompt: string): Promise<Record<string, string>> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
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
  try {
    return JSON.parse(
      raw
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim(),
    ) as Record<string, string>;
  } catch {
    throw new Error("Translation service returned an unexpected response");
  }
}

const RULES = [
  "Keep any Markdown formatting, links and paragraph structure exactly as they are.",
  "Use a warm, professional editorial tone.",
  "Do not translate proper nouns such as ICF, ACC, PCC, MCC, Zürich, Lausanne, Lugano, or URLs.",
  "Never translate the organisation name: keep 'The Switzerland Chapter of ICF' as it is.",
];

export const translateNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    // Paid AI call: gate before touching the gateway.
    await assertStaff(ctx);
    const supabase = ctx.supabase;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Translation service is not configured");

    const { data: edition, error } = await supabase
      .from("newsletters")
      .select("id, title, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!edition) throw new Error("Newsletter not found");

    const { data: blockRows, error: blockError } = await supabase
      .from("newsletter_blocks")
      .select("id, title, content, image_alt, enabled, updated_at")
      .eq("newsletter_id", data.id)
      .eq("enabled", true)
      .order("position", { ascending: true });
    if (blockError) throw new Error(blockError.message);
    const blocks = (blockRows ?? []) as {
      id: string;
      title: string;
      content: string | null;
      image_alt: string | null;
      updated_at: string;
    }[];

    const target = LOCALE_NAMES[data.locale];
    const now = new Date().toISOString();

    // 1. Edition title + mail subject.
    const meta = await translateJson(
      apiKey,
      [
        `Translate this newsletter edition title from English into ${target}.`,
        ...RULES,
        'Respond with JSON only, in the shape {"title": "...", "subject": "..."}, where "subject" is a short email subject line (max 80 characters) based on the title.',
        "",
        `TITLE: ${edition.title}`,
      ].join("\n"),
    );

    const { error: metaError } = await supabase.from("newsletter_translations").upsert(
      {
        newsletter_id: edition.id,
        locale: data.locale,
        title: (meta.title ?? "").trim() || edition.title,
        subject: (meta.subject ?? meta.title ?? "").trim() || edition.title,
        manually_edited: false,
        source_updated_at: edition.updated_at,
        updated_at: now,
      },
      { onConflict: "newsletter_id,locale" },
    );
    if (metaError) throw new Error(metaError.message);

    // 2. One call per enabled block, so long editions stay in small requests.
    let translated = 0;
    for (const block of blocks) {
      const hasSource = [block.title, block.content].some((v) => (v ?? "").trim().length > 0);
      if (!hasSource) continue;

      const parsed = await translateJson(
        apiKey,
        [
          `Translate this newsletter section from English into ${target}.`,
          ...RULES,
          'Respond with JSON only, in the shape {"title": "...", "content": "...", "imageAlt": "..."}.',
          "",
          `TITLE: ${block.title}`,
          `IMAGE ALT: ${block.image_alt ?? ""}`,
          "CONTENT:",
          block.content ?? "",
        ].join("\n"),
      );

      const { error: blockUpsertError } = await supabase
        .from("newsletter_block_translations")
        .upsert(
          {
            block_id: block.id,
            locale: data.locale,
            title: (parsed.title ?? "").trim() || block.title,
            content: (parsed.content ?? "").trim(),
            image_alt: (parsed.imageAlt ?? "").trim() || block.image_alt,
            manually_edited: false,
            source_updated_at: block.updated_at,
            updated_at: now,
          },
          { onConflict: "block_id,locale" },
        );
      if (blockUpsertError) throw new Error(blockUpsertError.message);
      translated += 1;
    }

    return { locale: data.locale, blocks: translated };
  });
