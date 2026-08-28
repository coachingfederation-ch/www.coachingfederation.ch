/**
 * Chapter overview dashboard — shared vocabulary.
 *
 * Client-safe: types, range arithmetic and formatting only. The aggregation
 * lives in `chapter-overview.server.ts` so the numbers on screen and the rows
 * in the CSV are produced once, by the same code.
 */

/** Preset ranges offered in the range bar. `custom` carries explicit dates. */
export type OverviewRangeKey = "30d" | "90d" | "12m" | "ytd" | "custom";

export const RANGE_KEYS: OverviewRangeKey[] = ["30d", "90d", "12m", "ytd", "custom"];

/** Inclusive ISO instants. `from` is the start of the first day, `to` "now". */
export type OverviewRange = { from: string; to: string };

/** A panel that can be exported. */
export type OverviewPanel = "content" | "events" | "members" | "coachFinder" | "conversations";

export const OVERVIEW_PANELS: OverviewPanel[] = [
  "content",
  "events",
  "members",
  "coachFinder",
  "conversations",
];

/** A headline number plus the same number over the preceding period. */
export type Delta = { current: number; previous: number };

/** One labelled slice of a breakdown (donut, bar, list). */
export type Slice = { label: string; value: number };

/** One time bucket. `date` is `YYYY-MM-DD` (day buckets) or `YYYY-MM`. */
export type SeriesPoint = { date: string } & Record<string, string | number>;

export type OverviewKpis = {
  articles: Delta;
  newsletters: Delta;
  events: Delta;
  registrations: Delta;
  checkIns: Delta;
  newMembers: Delta;
  guestPasses: Delta;
  chatConversations: Delta;
};

export type ContentPanelData = {
  articlesPublished: number;
  newslettersSent: number;
  articlesByBucket: SeriesPoint[];
  articleStatus: Slice[];
  articleLanguages: Slice[];
  newsletters: {
    id: string;
    title: string;
    language: string;
    publishedAt: string | null;
    blocks: number;
  }[];
};

export type EventsPanelData = {
  events: number;
  registrations: number;
  checkIns: number;
  attendanceRate: number | null;
  netCents: number;
  currency: string;
  byBucket: SeriesPoint[];
  statusMix: Slice[];
  modeMix: Slice[];
  cce: {
    events: number;
    awards: number;
    ccHours: number;
    rdHours: number;
    certificates: number;
    certificateEvents: number;
  };
  guestPasses: { issued: number; approved: number; declined: number; pending: number };
};

export type MembersPanelData = {
  total: number;
  active: number;
  grace: number;
  inactive: number;
  anonymized: number;
  claimed: number;
  unclaimed: number;
  joined: number;
  joinedByBucket: SeriesPoint[];
  credentials: Slice[];
  lastSync: {
    status: string;
    finishedAt: string | null;
    created: number;
    updated: number;
    deactivated: number;
  } | null;
};

export type CoachFinderPanelData = {
  published: number;
  hidden: number;
  visibility: Slice[];
  credentials: Slice[];
  languages: Slice[];
  regions: Slice[];
  specialisations: Slice[];
};

export type ConversationsPanelData = {
  agent: {
    conversations: number;
    interactions: number;
    escalationRate: number | null;
    helpfulRate: number | null;
    outcomes: Slice[];
    topCategories: Slice[];
    byBucket: SeriesPoint[];
  };
  live: {
    conversations: number;
    answered: number;
    messages: number;
    answerRate: number | null;
    byBucket: SeriesPoint[];
  };
};

export type ChapterOverview = {
  range: OverviewRange;
  previousRange: OverviewRange;
  bucket: "day" | "month";
  generatedAt: string;
  kpis: OverviewKpis;
  content: ContentPanelData;
  events: EventsPanelData;
  members: MembersPanelData;
  coachFinder: CoachFinderPanelData;
  conversations: ConversationsPanelData;
};

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Resolves a preset (or a custom pair) into an explicit ISO range. */
export function resolveRange(
  key: OverviewRangeKey,
  custom?: { from?: string; to?: string },
): OverviewRange {
  const now = new Date();
  if (key === "custom" && custom?.from) {
    const from = startOfDay(new Date(custom.from));
    const to = custom.to ? new Date(new Date(custom.to).getTime() + DAY_MS - 1) : now;
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (key === "ytd") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString(),
      to: now.toISOString(),
    };
  }
  const days = key === "30d" ? 30 : key === "12m" ? 365 : 90;
  return {
    from: startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS)).toISOString(),
    to: now.toISOString(),
  };
}

/** The equally long window immediately before `range`, for the KPI deltas. */
export function previousRange(range: OverviewRange): OverviewRange {
  const from = new Date(range.from).getTime();
  const to = new Date(range.to).getTime();
  const span = Math.max(to - from, DAY_MS);
  return { from: new Date(from - span).toISOString(), to: new Date(from - 1).toISOString() };
}

/** Day buckets stay readable up to ~7 weeks; longer ranges roll up to months. */
export function bucketFor(range: OverviewRange): "day" | "month" {
  const span = new Date(range.to).getTime() - new Date(range.from).getTime();
  return span <= 50 * DAY_MS ? "day" : "month";
}

/** The bucket key an instant belongs to, or null when it is unusable. */
export function bucketKey(iso: string | null | undefined, bucket: "day" | "month"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const s = d.toISOString();
  return bucket === "day" ? s.slice(0, 10) : s.slice(0, 7);
}

/** Percentage of `part` in `whole`, rounded, or null when there is no base. */
export function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** `+12%`, `−4%`, `—`. Deliberately not localized: it is a bare indicator. */
export function deltaLabel(delta: Delta): string | null {
  if (delta.previous <= 0) return delta.current > 0 ? "+100%" : null;
  const pct = Math.round(((delta.current - delta.previous) / delta.previous) * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
