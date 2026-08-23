/**
 * Newsletter shared types and the fixed block roster.
 *
 * Browser-safe: types, the roster, and small pure helpers only. The editor UI,
 * the server functions and the scheduled jobs all agree on the roster defined
 * here, so a block type can never drift between the CMS and generation.
 */

import type { PlacedMark } from "./mark-placement";

export type NewsletterStatus = "draft" | "review" | "scheduled" | "published" | "unpublished";

export type NewsletterBlockType =
  | "presidents_message"
  | "specific_content"
  | "advertisement"
  | "insights"
  | "volunteering"
  | "organization_updates"
  | "project_updates"
  | "chat_questions"
  | "europe_pulse"
  | "bad_joke"
  | "upcoming_events";

/**
 * How a block gets its content:
 * - `asset`   — assembled by AI from live platform data, regenerable.
 * - `content` — written by an editor with the article-editor experience.
 * - `stub`    — a placeholder for a feature that is not built yet.
 */
export type BlockKind = "asset" | "content" | "stub";

export interface BlockSpec {
  type: NewsletterBlockType;
  kind: BlockKind;
  /** Default English title seeded on creation; editors may rename. */
  title: string;
}

/** Default order of a fresh edition. Position is the array index. */
export const BLOCK_ROSTER: readonly BlockSpec[] = [
  { type: "presidents_message", kind: "content", title: "President's message" },
  { type: "specific_content", kind: "content", title: "Specific content" },
  { type: "advertisement", kind: "stub", title: "Advertisement" },
  { type: "insights", kind: "asset", title: "Insights" },
  { type: "advertisement", kind: "stub", title: "Advertisement" },
  { type: "volunteering", kind: "asset", title: "Volunteering options" },
  { type: "organization_updates", kind: "asset", title: "Organization updates" },
  { type: "project_updates", kind: "stub", title: "Project updates (ICFS Aspire)" },
  { type: "chat_questions", kind: "asset", title: "Newest asked questions" },
  { type: "europe_pulse", kind: "asset", title: "Europe Pulse" },
  { type: "bad_joke", kind: "asset", title: "Bad joke of the month" },
  { type: "upcoming_events", kind: "asset", title: "Upcoming events" },
] as const;

const KIND_BY_TYPE = new Map<NewsletterBlockType, BlockKind>(
  BLOCK_ROSTER.map((b) => [b.type, b.kind]),
);

export function blockKind(type: string): BlockKind {
  return KIND_BY_TYPE.get(type as NewsletterBlockType) ?? "content";
}

/** Block types an editor may add on top of the seeded roster. */
export const ADDABLE_BLOCK_TYPES: readonly NewsletterBlockType[] = [
  "specific_content",
  "advertisement",
];

export interface NewsletterRow {
  id: string;
  title: string;
  slug: string;
  status: NewsletterStatus;
  language: string;
  issue_date: string;
  scheduled_at: string | null;
  published_at: string | null;
  first_published_at: string | null;
  last_refreshed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceRef {
  label: string;
  url?: string | null;
}

export interface NewsletterBlockRow {
  id: string;
  newsletter_id: string;
  block_type: NewsletterBlockType;
  title: string;
  content: string;
  note: string | null;
  enabled: boolean;
  position: number;
  source_refs: SourceRef[];
  source_fingerprint: string | null;
  featured_image_url: string | null;
  image_alt: string | null;
  image_source: "unsplash" | "upload" | "url" | "ai" | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
  /** Uncropped source, kept so the framing stays re-editable. */
  image_original_url: string | null;
  image_aspect: string | null;
  image_crop: { xPct: number; yPct: number; zoom: number } | null;
  image_marks: PlacedMark[] | null;

  generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** `2026-03-01` → `newsletter-2026-03`. Stable per issue month. */
export function issueSlug(issueDate: string): string {
  return `newsletter-${issueDate.slice(0, 7)}`;
}

/** First day of the month an ISO date falls into, as `YYYY-MM-DD`. */
export function monthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Default English edition title, e.g. "Chapter newsletter — March 2026". */
export function defaultTitle(issueDate: string): string {
  const [year, month] = issueDate.split("-");
  return `Chapter newsletter — ${MONTHS[Number(month) - 1]} ${year}`;
}

export function formatIssueDate(issueDate: string, locale: string): string {
  const d = new Date(`${issueDate}T00:00:00Z`);
  return d.toLocaleDateString(locale === "en" ? "en-GB" : locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
