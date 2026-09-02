/**
 * Reader-feedback storage, aggregation and AI theme clustering.
 *
 * Writes come from the public submit route (anonymous readers); reads are
 * staff-only and go through the admin client because `article_feedback` grants
 * `anon`/`authenticated` an INSERT and no SELECT — the role check happens in
 * `article-feedback.functions.ts` before anything here runs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  summarise,
  topicSlug,
  type ArticleFeedbackInput,
  type ArticleFeedbackRow,
  type ArticleFeedbackSummary,
  type ChapterFeedbackReport,
  type EditorialTheme,
  type EditorialThemes,
} from "./article-feedback";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";
/** Hard ceiling on what one report pulls into memory. */
const SCAN_LIMIT = 5_000;
/** How many comments one clustering call sees. */
const CLUSTER_LIMIT = 200;

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseClient;
}

/** Salted SHA-256 so a stored hash cannot be reversed into an address. */
async function hashIp(ip: string): Promise<string | null> {
  if (!ip || ip === "unknown") return null;
  const salt = process.env.SUPABASE_PROJECT_ID ?? "icfs";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Inserts one response. Returns false when the article is not published. */
export async function recordArticleFeedback(
  input: ArticleFeedbackInput & { website?: string },
  ip: string,
): Promise<boolean> {
  const db = await admin();

  // Feedback only exists for articles a reader can actually have read.
  const { data: article } = await db
    .from("articles")
    .select("id, status")
    .eq("id", input.articleId)
    .maybeSingle();
  if (!article || (article as { status: string }).status !== "published") return false;

  const topics = Array.from(
    new Map((input.topics ?? []).map((topic) => [topicSlug(topic), topic.trim()])).values(),
  ).filter(Boolean);

  const { error } = await db.from("article_feedback").insert({
    article_id: input.articleId,
    locale: input.locale || "en",
    depth: input.depth,
    usefulness: input.usefulness,
    topics,
    comment: input.comment?.trim() || null,
    email: input.email?.trim() || null,
    ip_hash: await hashIp(ip),
  });
  if (error) throw new Error(error.message);
  return true;
}

export type FeedbackFilters = {
  from?: string;
  to?: string;
  locale?: string;
  categoryId?: string;
};

async function fetchRows(
  articleId: string | null,
  filters: FeedbackFilters,
): Promise<ArticleFeedbackRow[]> {
  const db = await admin();
  let articleIds: string[] | null = null;

  if (filters.categoryId && filters.categoryId !== "all") {
    const { data } = await db.from("articles").select("id").eq("category_id", filters.categoryId);
    articleIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
    if (articleIds.length === 0) return [];
  }

  let query = db
    .from("article_feedback")
    .select("id, article_id, locale, depth, usefulness, topics, comment, email, created_at")
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);

  if (articleId) query = query.eq("article_id", articleId);
  else if (articleIds) query = query.in("article_id", articleIds);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  if (filters.locale && filters.locale !== "all") query = query.eq("locale", filters.locale);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ArticleFeedbackRow[];
}

/** Aggregate for one article's Feedback tab. */
export async function buildArticleFeedback(articleId: string): Promise<{
  summary: ArticleFeedbackSummary;
  themes: EditorialThemes | null;
}> {
  const rows = await fetchRows(articleId, {});
  return { summary: summarise(rows), themes: await readThemes(articleId) };
}

/** Chapter-wide report for `/manage/editorial-signals`. */
export async function buildChapterFeedback(
  filters: FeedbackFilters,
): Promise<ChapterFeedbackReport> {
  const rows = await fetchRows(null, filters);
  const summary = summarise(rows);

  const byArticle = new Map<string, ArticleFeedbackRow[]>();
  for (const row of rows) {
    const bucket = byArticle.get(row.article_id);
    if (bucket) bucket.push(row);
    else byArticle.set(row.article_id, [row]);
  }

  const db = await admin();
  const ids = Array.from(byArticle.keys());
  const titles = new Map<string, { title: string; category: string | null }>();
  if (ids.length > 0) {
    const { data } = await db
      .from("articles")
      .select("id, title, categories:category_id (name)")
      .in("id", ids);
    for (const row of (data ?? []) as {
      id: string;
      title: string;
      categories: { name: string } | { name: string }[] | null;
    }[]) {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      titles.set(row.id, { title: row.title, category: category?.name ?? null });
    }
  }

  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

  const perArticle = ids
    .map((id) => {
      const bucket = byArticle.get(id) ?? [];
      const meta = titles.get(id);
      return {
        id,
        title: meta?.title ?? "—",
        category: meta?.category ?? null,
        responses: bucket.length,
        depth: mean(bucket.map((r) => r.depth)),
        usefulness: mean(bucket.map((r) => r.usefulness)),
      };
    })
    .sort((a, b) => b.responses - a.responses);

  const months = new Map<string, ArticleFeedbackRow[]>();
  for (const row of rows) {
    const month = row.created_at.slice(0, 7);
    const bucket = months.get(month);
    if (bucket) bucket.push(row);
    else months.set(month, [row]);
  }
  const byMonth = Array.from(months.entries())
    .map(([month, bucket]) => ({
      month,
      responses: bucket.length,
      depth: mean(bucket.map((r) => r.depth)),
      usefulness: mean(bucket.map((r) => r.usefulness)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { summary, perArticle, byMonth, themes: await readThemes(null) };
}

/** Cached AI output, or null when nothing has been generated yet. */
export async function readThemes(articleId: string | null): Promise<EditorialThemes | null> {
  const db = await admin();
  const query = db
    .from("article_feedback_themes")
    .select("payload, response_count, generated_at")
    .eq("scope", articleId ? "article" : "chapter");
  const { data } = articleId
    ? await query.eq("article_id", articleId).maybeSingle()
    : await query.is("article_id", null).maybeSingle();
  if (!data) return null;
  const row = data as { payload: unknown; response_count: number; generated_at: string };
  const payload = (row.payload ?? {}) as { summary?: string; themes?: EditorialTheme[] };
  return {
    summary: payload.summary ?? "",
    themes: payload.themes ?? [],
    generated_at: row.generated_at,
    response_count: row.response_count,
  };
}

/** One AI call in JSON mode. Throws with the gateway status on failure. */
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
  if (res.status === 429) throw new Error("The AI service is busy. Please try again shortly.");
  if (res.status === 402 || res.status === 403) {
    throw new Error("AI credits are unavailable. Please contact the workspace owner.");
  }
  if (!res.ok) throw new Error(`AI gateway ${res.status}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
}

const SYSTEM = [
  "You analyse reader feedback for the editorial team of The Switzerland Chapter of ICF,",
  "a professional coaching body. Readers rate each article on two 1-5 dials —",
  "depth (1 = too light, 5 = too deep) and usefulness (1 = merely interesting,",
  "5 = I will use this) — pick topics they want next, and may add one sentence.",
  "Cluster the sentences into distinct editorial themes. Never invent a quote:",
  "every quote must appear verbatim in the input. Write in clear, warm,",
  "American English, active voice, no marketing language.",
  'Answer as JSON: {"summary": string, "themes": [{"title": string, "insight": string,',
  '"quotes": [string], "suggestion": string}]}. At most five themes.',
  "`summary` is two or three sentences on what to change; `suggestion` is one",
  "concrete editorial action.",
].join(" ");

/** Regenerates and caches the themes for one article, or for the chapter. */
export async function generateThemes(articleId: string | null): Promise<EditorialThemes> {
  const rows = await fetchRows(articleId, {});
  const summary = summarise(rows);
  const comments = summary.comments.slice(0, CLUSTER_LIMIT);

  let payload: { summary: string; themes: EditorialTheme[] } = { summary: "", themes: [] };
  if (comments.length > 0 || summary.responses > 0) {
    const brief = [
      `Responses: ${summary.responses}.`,
      `Average depth: ${summary.depth.average?.toFixed(2) ?? "n/a"} (1 too light, 5 too deep).`,
      `Average usefulness: ${summary.usefulness.average?.toFixed(2) ?? "n/a"}.`,
      `Requested topics: ${
        summary.topics
          .slice(0, 20)
          .map((t) => `${t.topic} (${t.count})`)
          .join(", ") || "none"
      }.`,
      "Reader sentences:",
      ...comments.map((c) => `- [${c.locale}] ${c.comment}`),
    ].join("\n");

    const raw = (await askAi(
      SYSTEM,
      articleId
        ? `Feedback on a single article.\n${brief}`
        : `Feedback across all articles of the chapter.\n${brief}`,
    )) as { summary?: unknown; themes?: unknown };

    payload = {
      summary: typeof raw.summary === "string" ? raw.summary : "",
      themes: Array.isArray(raw.themes)
        ? (raw.themes as Record<string, unknown>[]).slice(0, 5).map((theme) => ({
            title: String(theme.title ?? "").slice(0, 120),
            insight: String(theme.insight ?? "").slice(0, 600),
            quotes: Array.isArray(theme.quotes)
              ? theme.quotes.slice(0, 4).map((q) => String(q).slice(0, 400))
              : [],
            suggestion: String(theme.suggestion ?? "").slice(0, 300),
          }))
        : [],
    };
  }

  const db = await admin();
  const generated_at = new Date().toISOString();
  const row = {
    scope: articleId ? "article" : "chapter",
    article_id: articleId,
    payload,
    response_count: summary.responses,
    generated_at,
  };
  // One cached row per scope, so a regeneration replaces the previous answer.
  const lookup = db.from("article_feedback_themes").select("id").eq("scope", row.scope);
  const { data: match } = articleId
    ? await lookup.eq("article_id", articleId).maybeSingle()
    : await lookup.is("article_id", null).maybeSingle();

  if (match) {
    await db
      .from("article_feedback_themes")
      .update(row)
      .eq("id", (match as { id: string }).id);
  } else {
    await db.from("article_feedback_themes").insert(row);
  }

  return { ...payload, generated_at, response_count: summary.responses };
}

/** CSV of every matching response, for the chapter dashboard export. */
export async function buildFeedbackCsv(filters: FeedbackFilters): Promise<string> {
  const rows = await fetchRows(null, filters);
  const header = ["created_at", "article_id", "locale", "depth", "usefulness", "topics", "comment"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      row.created_at,
      row.article_id,
      row.locale,
      String(row.depth),
      String(row.usefulness),
      (row.topics ?? []).join("; "),
      row.comment ?? "",
    ]
      .map(escape)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
