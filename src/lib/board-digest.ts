/**
 * Board digest — client-safe vocabulary and scheduling rules.
 *
 * The digest is one email to one configured address (the board's group
 * mailbox). The cron route runs hourly; `isDigestDue` alone decides whether
 * this hour is the one to send, so the rule can be unit-tested.
 */
import type { OverviewKpis } from "./chapter-overview";

export const DIGEST_SECTIONS = ["members", "articles", "events", "assistant"] as const;
export type DigestSection = (typeof DIGEST_SECTIONS)[number];
export type DigestSections = Record<DigestSection, boolean>;

export const DEFAULT_SECTIONS: DigestSections = {
  members: true,
  articles: true,
  events: true,
  assistant: true,
};

export type DigestCadence = "weekly" | "biweekly";

export type BoardDigestSettings = {
  enabled: boolean;
  recipient: string;
  cadence: DigestCadence;
  /** 0 = Sunday … 6 = Saturday, Zurich time. */
  weekday: number;
  /** 0–23, Zurich time. */
  hour: number;
  sections: DigestSections;
  lastSentAt: string | null;
  lastStatus: string | null;
};

/** Items shown per list before "and N more". */
export const DIGEST_LIST_CAP = 15;

export const DIGEST_TIME_ZONE = "Europe/Zurich";

const DAY_MS = 86_400_000;

/** Weekday (0–6) and hour (0–23) of `at` in Zurich. */
export function zurichWeekdayHour(at: Date): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DIGEST_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  return { weekday, hour: hour % 24 };
}

/** Days the digest covers, and the minimum gap between two sends. */
export function cadenceDays(cadence: DigestCadence): number {
  return cadence === "biweekly" ? 14 : 7;
}

/**
 * True when the scheduled slot is now and the previous send is at least one
 * cadence ago (minus a day of slack, so a slightly late run still counts).
 */
export function isDigestDue(
  settings: Pick<BoardDigestSettings, "enabled" | "cadence" | "weekday" | "hour" | "lastSentAt">,
  now: Date,
): boolean {
  if (!settings.enabled) return false;
  const { weekday, hour } = zurichWeekdayHour(now);
  if (weekday !== settings.weekday || hour !== settings.hour) return false;
  if (!settings.lastSentAt) return true;
  const gap = now.getTime() - new Date(settings.lastSentAt).getTime();
  return gap >= (cadenceDays(settings.cadence) - 1) * DAY_MS;
}

/** Reads a stored sections value, keeping unknown keys out and defaults in. */
export function normaliseSections(value: unknown): DigestSections {
  const out = { ...DEFAULT_SECTIONS };
  if (value && typeof value === "object") {
    for (const key of DIGEST_SECTIONS) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === "boolean") out[key] = v;
    }
  }
  return out;
}

export type DigestListItem = { primary: string; secondary?: string; tertiary?: string };
export type DigestList = { items: DigestListItem[]; more: number; total: number };

export type BoardDigestData = {
  periodLabel: string;
  from: string;
  to: string;
  kpis: OverviewKpis;
  sections: DigestSections;
  members?: {
    newMembers: DigestList;
    changes: { label: string; count: number }[];
    changedMembers: DigestList;
    deactivated: DigestList;
    enteredGrace: DigestList;
    retention: { inGrace: number; due: number; pastExpiry: number };
  };
  articles?: DigestList;
  events?: DigestList;
  assistant?: {
    total: number;
    successRate: number | null;
    escalationRate: number | null;
    helpfulRate: number | null;
    topCategories: { label: string; count: number }[];
    escalations: DigestList;
  };
  overviewUrl: string;
};

/** Caps a list and records how many were cut. */
export function capList(items: DigestListItem[], cap = DIGEST_LIST_CAP): DigestList {
  return { items: items.slice(0, cap), more: Math.max(0, items.length - cap), total: items.length };
}
