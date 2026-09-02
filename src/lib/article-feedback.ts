/**
 * Shared types and helpers for reader feedback on Insights articles.
 *
 * Client-safe: imported by the public panel, the staff surfaces and the
 * server modules alike, so it holds no secrets and no server-only imports.
 * Exports: DIAL_MIN, DIAL_MAX, DIAL_MID, ArticleFeedbackInput, ArticleFeedbackRow,
 * ArticleFeedbackSummary, EditorialThemes, feedbackStorageKey, topicSlug, average.
 */

/** Both dials are 1-5 so a neutral answer is the exact middle. */
export const DIAL_MIN = 1;
export const DIAL_MAX = 5;
export const DIAL_MID = 3;

export const MAX_TOPICS = 5;
export const MAX_TOPIC_LENGTH = 48;
export const MAX_COMMENT_LENGTH = 600;

/** What the browser posts to the public submit route. */
export interface ArticleFeedbackInput {
  articleId: string;
  locale: string;
  depth: number;
  usefulness: number;
  topics: string[];
  comment?: string;
  email?: string;
}

/** One stored response, as staff surfaces read it. */
export interface ArticleFeedbackRow {
  id: string;
  article_id: string;
  locale: string;
  depth: number;
  usefulness: number;
  topics: string[];
  comment: string | null;
  email: string | null;
  created_at: string;
}

export interface TopicCount {
  topic: string;
  count: number;
}

export interface DialDistribution {
  /** Index 0 is value 1, index 4 is value 5. */
  counts: number[];
  average: number | null;
}

/** Aggregate for one article, or for the whole chapter. */
export interface ArticleFeedbackSummary {
  responses: number;
  depth: DialDistribution;
  usefulness: DialDistribution;
  topics: TopicCount[];
  comments: { id: string; comment: string; locale: string; created_at: string }[];
  withEmail: number;
}

export interface EditorialTheme {
  title: string;
  insight: string;
  quotes: string[];
  suggestion: string;
}

/** Cached AI output. `summary` is the per-article "what to change" note. */
export interface EditorialThemes {
  summary: string;
  themes: EditorialTheme[];
  generated_at: string;
  response_count: number;
}

/** One submission per reader per article, remembered in that browser only. */
export function feedbackStorageKey(articleId: string): string {
  return `icfs-article-feedback:${articleId}`;
}

/** Normalised comparison key so "Team coaching" and "team  coaching" merge. */
export function topicSlug(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, " ");
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Turns a 1-5 dial value into the 0-4 bucket index used by the distributions. */
export function dialBucket(value: number): number {
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, Math.round(value))) - DIAL_MIN;
}

export function summarise(rows: ArticleFeedbackRow[]): ArticleFeedbackSummary {
  const depthCounts = [0, 0, 0, 0, 0];
  const usefulnessCounts = [0, 0, 0, 0, 0];
  const topicCounts = new Map<string, { label: string; count: number }>();
  const comments: ArticleFeedbackSummary["comments"] = [];
  let withEmail = 0;

  for (const row of rows) {
    depthCounts[dialBucket(row.depth)] += 1;
    usefulnessCounts[dialBucket(row.usefulness)] += 1;
    for (const raw of row.topics ?? []) {
      const key = topicSlug(raw);
      if (!key) continue;
      const existing = topicCounts.get(key);
      if (existing) existing.count += 1;
      else topicCounts.set(key, { label: raw.trim(), count: 1 });
    }
    if (row.comment && row.comment.trim()) {
      comments.push({
        id: row.id,
        comment: row.comment.trim(),
        locale: row.locale,
        created_at: row.created_at,
      });
    }
    if (row.email) withEmail += 1;
  }

  return {
    responses: rows.length,
    depth: { counts: depthCounts, average: average(rows.map((r) => r.depth)) },
    usefulness: { counts: usefulnessCounts, average: average(rows.map((r) => r.usefulness)) },
    topics: Array.from(topicCounts.values())
      .map((entry) => ({ topic: entry.label, count: entry.count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic)),
    comments: comments.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    withEmail,
  };
}

/** Chapter-wide aggregate, as the Editorial signals dashboard reads it. */
export interface ChapterFeedbackReport {
  summary: ArticleFeedbackSummary;
  perArticle: {
    id: string;
    title: string;
    category: string | null;
    responses: number;
    depth: number | null;
    usefulness: number | null;
  }[];
  byMonth: { month: string; responses: number; depth: number | null; usefulness: number | null }[];
  themes: EditorialThemes | null;
}
