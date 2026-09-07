/**
 * Server-only read path for member guides.
 *
 * Reads go through the publishable-key client so RLS still applies: only
 * published guides are visible to an anonymous visitor, which is exactly what
 * these pages show. Localized copy is merged over the English source, field by
 * field, so a partial translation still renders a complete page.
 */
import type {
  Guide,
  GuideCallout,
  GuideCalloutKind,
  GuideFaqItem,
  GuideSection,
  GuideSectionKind,
  GuideSummary,
  GuideTone,
} from "./guides";

type Row = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** Prefer the translated value, fall back to the source when it is blank. */
const pick = (translated: unknown, source: unknown): string => {
  const value = str(translated).trim();
  return value.length > 0 ? value : str(source);
};

/** Every published guide, ordered for the index page. */
export async function loadPublishedGuides(locale: string): Promise<GuideSummary[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const { data, error } = await publicSupabaseClient()
    .from("guides")
    .select(
      "id, slug, title, summary, eyebrow, updated_at, guide_translations(locale, title, summary, eyebrow)",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as Row[]).map((row) => {
    const tr =
      ((row.guide_translations as Row[] | null) ?? []).find((t) => t.locale === locale) ?? {};
    return {
      id: String(row.id),
      slug: str(row.slug),
      title: pick(tr.title, row.title),
      summary: pick(tr.summary, row.summary),
      eyebrow: pick(tr.eyebrow, row.eyebrow),
      updatedAt: str(row.updated_at),
    } satisfies GuideSummary;
  });
}

/** One published guide with its sections, or null when the slug is unknown. */
export async function loadPublishedGuide(slug: string, locale: string): Promise<Guide | null> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const client = publicSupabaseClient();

  const { data, error } = await client
    .from("guides")
    .select(
      "id, slug, title, summary, eyebrow, intro, version_label, contact_email, footnote, updated_at, guide_translations(locale, title, summary, eyebrow, intro, footnote)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Row;
  const tr =
    ((row.guide_translations as Row[] | null) ?? []).find((t) => t.locale === locale) ?? {};

  const { data: sectionData, error: sectionError } = await client
    .from("guide_sections")
    .select(
      [
        "id, position, kind, tone, eyebrow, heading, lead, body",
        "guide_section_translations(locale, eyebrow, heading, lead, body)",
        "guide_section_callouts(id, position, kind, label, body, guide_callout_translations(locale, label, body))",
        "guide_faq_items(id, position, question, answer, quote, guide_faq_item_translations(locale, question, answer, quote))",
      ].join(", "),
    )
    .eq("guide_id", row.id as string)
    .order("position", { ascending: true });
  if (sectionError) throw sectionError;

  const byLocale = (rows: unknown, key = "locale"): Row =>
    ((rows as Row[] | null) ?? []).find((t) => t[key] === locale) ?? {};

  const sections = ((sectionData ?? []) as unknown as Row[]).map((section) => {
    const st = byLocale(section.guide_section_translations);

    const callouts = ((section.guide_section_callouts as Row[] | null) ?? [])
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((callout) => {
        const ct = byLocale(callout.guide_callout_translations);
        return {
          id: String(callout.id),
          position: Number(callout.position ?? 0),
          kind: (str(callout.kind) || "info") as GuideCalloutKind,
          label: pick(ct.label, callout.label),
          body: pick(ct.body, callout.body),
        } satisfies GuideCallout;
      });

    const faq = ((section.guide_faq_items as Row[] | null) ?? [])
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
      .map((item) => {
        const it = byLocale(item.guide_faq_item_translations);
        return {
          id: String(item.id),
          position: Number(item.position ?? 0),
          question: pick(it.question, item.question),
          answer: pick(it.answer, item.answer),
          quote: pick(it.quote, item.quote),
        } satisfies GuideFaqItem;
      });

    return {
      id: String(section.id),
      position: Number(section.position ?? 0),
      kind: (str(section.kind) || "article") as GuideSectionKind,
      tone: (str(section.tone) || "neutral") as GuideTone,
      eyebrow: pick(st.eyebrow, section.eyebrow),
      heading: pick(st.heading, section.heading),
      lead: pick(st.lead, section.lead),
      body: pick(st.body, section.body),
      callouts,
      faq,
    } satisfies GuideSection;
  });

  return {
    id: String(row.id),
    slug: str(row.slug),
    title: pick(tr.title, row.title),
    summary: pick(tr.summary, row.summary),
    eyebrow: pick(tr.eyebrow, row.eyebrow),
    intro: pick(tr.intro, row.intro),
    versionLabel: str(row.version_label),
    contactEmail: (row.contact_email as string | null) ?? null,
    footnote: pick(tr.footnote, row.footnote),
    updatedAt: str(row.updated_at),
    sections,
  } satisfies Guide;
}
