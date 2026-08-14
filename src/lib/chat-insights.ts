/**
 * Client-safe vocabulary for Chat Agent Insights.
 *
 * Everything here crosses the server-function boundary, so it is plain data:
 * ISO date strings, counts and rates. Rates are `null` — never 0 — when the
 * denominator does not exist, so "no feedback yet" can never render as "0%
 * helpful".
 */
export const CHAT_OUTCOMES = [
  "successful",
  "partially_successful",
  "escalated",
  "unsuccessful",
  "unknown",
] as const;

export type ChatOutcome = (typeof CHAT_OUTCOMES)[number];

export const CHAT_FEEDBACK_VALUES = ["helpful", "not_helpful"] as const;
export type ChatFeedback = (typeof CHAT_FEEDBACK_VALUES)[number];

/** Filter set every number, chart, table row and CSV export obeys. */
export type ChatInsightFilters = {
  /** Inclusive yyyy-mm-dd bounds on `occurred_at`; empty string means open. */
  from: string;
  to: string;
  /** Category slug or "all". */
  category: string;
  /** Outcome or "all". */
  outcome: string;
  /** all | shown | not_shown | clicked */
  contact: string;
  /** Locale code or "all". */
  language: string;
  /** all | helpful | not_helpful | none */
  feedback: string;
  /** Free text over the category detail and escalation reason. */
  search: string;
};

export const EMPTY_CHAT_FILTERS: ChatInsightFilters = {
  from: "",
  to: "",
  category: "all",
  outcome: "all",
  contact: "all",
  language: "all",
  feedback: "all",
  search: "",
};

export type ChatCategory = {
  id: string;
  slug: string;
  labelEn: string;
  labelDe: string;
  labelFr: string;
  labelIt: string;
  sortOrder: number;
  isActive: boolean;
};

export type ChatLogRow = {
  id: string;
  occurredAt: string;
  sessionId: string | null;
  categorySlug: string;
  categoryDetail: string | null;
  locale: string;
  outcome: ChatOutcome;
  contactShown: boolean;
  contactClicked: boolean;
  escalationReason: string | null;
  feedback: ChatFeedback | null;
};

export type ChatInsightSummary = {
  /** Every interaction ever logged, ignoring the filters. */
  totalAllTime: number;
  /** Interactions matching the current filters. */
  total: number;
  successRate: number | null;
  escalationRate: number | null;
  contactShownRate: number | null;
  helpfulRate: number | null;
  feedbackCount: number;
};

export type ChatCategoryPoint = { slug: string; count: number };
export type ChatOutcomePoint = { outcome: ChatOutcome; count: number };
export type ChatContactPoint = { date: string; shown: number; clicked: number; total: number };
export type ChatFeedbackPoint = { helpful: number; notHelpful: number };

export type ChatInsightReport = {
  summary: ChatInsightSummary;
  byCategory: ChatCategoryPoint[];
  byOutcome: ChatOutcomePoint[];
  contactSeries: ChatContactPoint[];
  feedback: ChatFeedbackPoint;
  categories: ChatCategory[];
  languages: string[];
  rows: ChatLogRow[];
  /** True when the row list was capped; the aggregates still cover everything. */
  truncated: boolean;
};

/** Percentage rounded to one decimal, or null when the base is absent. */
export function rate(part: number, whole: number): number | null {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function formatRate(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

/** yyyy-mm-dd for "n days ago", used by the period presets. */
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days + 1);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const LOCALE_TAGS: Record<string, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(LOCALE_TAGS[locale] ?? "en-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function categoryLabel(
  category: ChatCategory | undefined,
  slug: string,
  locale: string,
): string {
  if (!category) return slug;
  const byLocale: Record<string, string> = {
    en: category.labelEn,
    de: category.labelDe,
    fr: category.labelFr,
    it: category.labelIt,
  };
  return byLocale[locale] || category.labelEn || category.slug;
}
