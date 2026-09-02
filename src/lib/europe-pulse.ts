/**
 * Europe Pulse — shared, client-safe types and helpers.
 *
 * A "pulse" is one curated item (event, news, webinar, …) picked from the
 * public website of another ICF European chapter during the weekly scan.
 * Titles and descriptions are stored per locale so the feed reads natively in
 * DE / FR / IT / EN without any request-time AI call.
 */
import type { Locale } from "@/i18n/config";
import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";

/** `?week=YYYY-MM-DD` selects an archived edition; empty means "latest". */
export const europePulseSearchSchema = z.object({
  week: fallback(z.string(), "").default(""),
});
export type EuropePulseSearch = z.infer<typeof europePulseSearchSchema>;

export const PULSE_TYPES = ["event", "news", "webinar", "workshop", "conference"] as const;
export type PulseType = (typeof PULSE_TYPES)[number];
export type PulseStatus = "pending" | "published" | "hidden";
export type PulsePublishMode = "automatic" | "manual";

export type PulseRow = {
  id: string;
  week_of: string;
  chapter: string;
  country: string;
  country_code: string;
  type: PulseType;
  title_en: string;
  title_de: string | null;
  title_fr: string | null;
  title_it: string | null;
  description_en: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  url: string;
  event_date: string | null;
  status: PulseStatus;
  sort_rank: number;
};

/** What the public feed renders — already resolved to one language. */
export type PulseItem = {
  id: string;
  weekOf: string;
  chapter: string;
  country: string;
  countryCode: string;
  type: PulseType;
  title: string;
  description: string | null;
  url: string;
  eventDate: string | null;
};

export const PULSE_COLUMNS =
  "id, week_of, chapter, country, country_code, type, title_en, title_de, title_fr, title_it, " +
  "description_en, description_de, description_fr, description_it, url, event_date, status, sort_rank";

function pick(row: PulseRow, field: "title" | "description", locale: Locale): string | null {
  const value = (row as unknown as Record<string, string | null>)[`${field}_${locale}`];
  const fallback = (row as unknown as Record<string, string | null>)[`${field}_en`];
  const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  return clean(value) ?? clean(fallback);
}

export function localizePulse(row: PulseRow, locale: Locale): PulseItem {
  return {
    id: row.id,
    weekOf: row.week_of,
    chapter: row.chapter,
    country: row.country,
    countryCode: row.country_code,
    type: row.type,
    title: pick(row, "title", locale) ?? row.title_en,
    description: pick(row, "description", locale),
    url: row.url,
    eventDate: row.event_date,
  };
}

/** Regional-indicator flag emoji for a two-letter ISO country code. */
export function flagFor(countryCode: string): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Monday of the week containing `date`, as an ISO date string. */
export function weekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function formatPulseDate(iso: string | null, locale: Locale): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : `${locale}-CH`, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Stage a run is in. Progress is stored on the run row so an interrupted
 * scan can be resumed and shown in the CMS instead of hanging as "running". */
export type PulsePhase = "scanning" | "second_chance" | "curating" | "done" | "failed";

export type PulseProgress = {
  runId: string;
  weekOf: string;
  status: "running" | "succeeded" | "failed";
  phase: PulsePhase;
  /** Chapters already scanned, out of `total`. */
  done: number;
  total: number;
  chaptersOk: number;
  chaptersFailed: number;
  curatedItems: number;
  error?: string | null;
};
