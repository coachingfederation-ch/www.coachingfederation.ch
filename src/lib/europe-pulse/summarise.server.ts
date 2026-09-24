/**
 * Europe Pulse — AI extraction and curation.
 *
 * Turns scraped chapter markdown into candidate items (Stage 1) and ranks the
 * pooled candidates down to a published shortlist with DE/FR/IT translations
 * (Stage 2). All AI-gateway calls for the feature live in this module.
 */
import { PULSE_TYPES, type PulseType } from "../europe-pulse";
import type { ChapterRow } from "./crawl.server";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

export type ExtractedItem = {
  title: string;
  description: string | null;
  url: string;
  type: PulseType;
  event_date: string | null;
};

export type PoolItem = ExtractedItem & { chapter: string; country: string; country_code: string };

export type CuratedItem = PoolItem & {
  title_de: string | null;
  title_fr: string | null;
  title_it: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
};

function asType(value: unknown): PulseType {
  const v = String(value ?? "").toLowerCase();
  return (PULSE_TYPES as readonly string[]).includes(v) ? (v as PulseType) : "news";
}

function asDate(value: unknown): string | null {
  const v = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Today in ISO date form — the cut-off for "still relevant". */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The feed only carries items a member can still act on, so an item needs a
 * resolved date that has not passed. Undated items are dropped: the extraction
 * prompt is told to work the date out of the page content first.
 */
export function isStillRelevant(eventDate: string | null): boolean {
  return eventDate !== null && eventDate >= todayIso();
}

function absoluteUrl(raw: unknown, base: string): string | null {
  try {
    const url = new URL(String(raw ?? ""), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** One AI call, JSON mode. Throws with the gateway status on failure. */
async function askAi(system: string, user: string): Promise<unknown> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
}

export async function extractItems(
  chapter: ChapterRow,
  markdown: string,
): Promise<ExtractedItem[]> {
  if (markdown.trim().length < 200) return [];
  const parsed = (await askAi(
    "You read the homepage of a national chapter of the International Coaching Federation and " +
      "extract concrete, dated or clearly announced activities: events, webinars, workshops, " +
      "conferences and chapter news. Ignore navigation, membership boilerplate, cookie notices " +
      "and evergreen marketing copy. Translate every title and description into concise English. " +
      'Reply as {"items":[{"title","description","url","type","event_date"}]} with at most 5 items. ' +
      '"type" is one of event, news, webinar, workshop, conference. "event_date" is YYYY-MM-DD. ' +
      `Today is ${todayIso()}. Every item MUST carry a date that is today or later: work it out ` +
      "from the content (an explicit date, the last day of a date range, a registration or " +
      "application deadline, a year in the title). Skip anything that already happened, any recap " +
      "or report of a past activity, and anything whose date you cannot determine — return those " +
      "as no item at all rather than guessing or using null. " +
      '"url" is the most specific link you saw for the item, or the page URL. ' +
      "Descriptions are at most 220 characters. Reply with JSON only, and an empty array if nothing qualifies.",
    `Chapter: ${chapter.chapter} (${chapter.country})\nPage URL: ${chapter.base_url}\n\n${markdown}`,
  )) as { items?: unknown[] };

  return (parsed.items ?? [])
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const title = String(item.title ?? "").trim();
      if (!title) return null;
      // Undated or past items never enter the pool.
      const eventDate = asDate(item.event_date);
      if (!isStillRelevant(eventDate)) return null;
      const description = String(item.description ?? "").trim();
      return {
        title: title.slice(0, 200),
        description: description ? description.slice(0, 300) : null,
        url: absoluteUrl(item.url, chapter.base_url) ?? chapter.base_url,
        type: asType(item.type),
        event_date: eventDate,
      } satisfies ExtractedItem;
    })
    .filter((i): i is ExtractedItem => i !== null);
}

/** How many chosen items go into one translation call. */
const TRANSLATE_CHUNK = 8;

/**
 * Rank the pooled items down to `cap`, then translate them into DE/FR/IT.
 *
 * Why two steps: a single rank-and-translate call over a 60+ item pool ran
 * past the request time limit and killed the run in its curating phase. The
 * ranking call now returns indexes only (small output), and translation runs
 * in parallel chunks of TRANSLATE_CHUNK so each call stays short. A failed
 * translation chunk falls back to English rather than failing the run.
 */
export async function curate(
  pool: PoolItem[],
  cap: number,
  maxPerChapter: number,
): Promise<CuratedItem[]> {
  if (!pool.length) return [];
  const indexed = pool.map((item, index) => ({
    index,
    chapter: item.chapter,
    country: item.country,
    type: item.type,
    title: item.title,
    description: item.description,
    event_date: item.event_date,
  }));
  const parsed = (await askAi(
    "You curate a weekly digest of what ICF chapters across Europe are doing, for the Swiss " +
      "chapter's members. From the candidate list, pick the most relevant, concrete and " +
      `newsworthy items — at most ${cap} in total and at most ${maxPerChapter} per chapter — ` +
      "favouring upcoming events and genuine chapter news over generic pages, and spreading the " +
      "selection across as many countries as possible. " +
      'Reply as {"items":[{"index","type"}]} ordered best first, where "index" is the ' +
      "candidate's index. Reply with JSON only.",
    JSON.stringify(indexed),
  )) as { items?: unknown[] };

  const picked: PoolItem[] = [];
  const perChapter = new Map<string, number>();
  for (const raw of parsed.items ?? []) {
    const item = raw as Record<string, unknown>;
    const source = pool[Number(item.index)];
    if (!source || picked.includes(source)) continue;
    // Belt and braces: never let an undated or past item through to the feed.
    if (!isStillRelevant(source.event_date)) continue;
    const used = perChapter.get(source.chapter) ?? 0;
    if (used >= maxPerChapter) continue;
    if (picked.length >= cap) break;
    perChapter.set(source.chapter, used + 1);
    picked.push({ ...source, type: asType(item.type ?? source.type) });
  }

  const chunks: PoolItem[][] = [];
  for (let i = 0; i < picked.length; i += TRANSLATE_CHUNK) {
    chunks.push(picked.slice(i, i + TRANSLATE_CHUNK));
  }
  const translated = await Promise.all(chunks.map((chunk) => translateChunk(chunk)));
  return translated.flat();
}

async function translateChunk(chunk: PoolItem[]): Promise<CuratedItem[]> {
  const english = (source: PoolItem): CuratedItem => ({
    ...source,
    title_de: null,
    title_fr: null,
    title_it: null,
    description_de: null,
    description_fr: null,
    description_it: null,
  });
  let rows: unknown[] = [];
  try {
    const parsed = (await askAi(
      "Translate each item's title and description into Swiss Standard German (never use ß), " +
        "Swiss French and Swiss Italian; keep chapter names, place names and the credentials " +
        "ACC/PCC/MCC untranslated. " +
        'Reply as {"items":[{"index","title_de","description_de","title_fr","description_fr",' +
        '"title_it","description_it"}]}. Keep descriptions under 220 characters. JSON only.',
      JSON.stringify(
        chunk.map((c, index) => ({ index, title: c.title, description: c.description })),
      ),
    )) as { items?: unknown[] };
    rows = parsed.items ?? [];
  } catch (err) {
    console.error(`[europe-pulse] translation chunk failed: ${String(err)}`);
  }
  const byIndex = new Map<number, Record<string, unknown>>();
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    byIndex.set(Number(r.index), r);
  }
  return chunk.map((source, index) => {
    const r = byIndex.get(index);
    if (!r) return english(source);
    const text = (key: string) => {
      const value = String(r[key] ?? "").trim();
      return value ? value.slice(0, 300) : null;
    };
    return {
      ...source,
      title_de: text("title_de"),
      title_fr: text("title_fr"),
      title_it: text("title_it"),
      description_de: text("description_de"),
      description_fr: text("description_fr"),
      description_it: text("description_it"),
    };
  });
}
