/**
 * Board digest — client-safe vocabulary and scheduling rules.
 *
 * The digest is one email to one configured address (the board's group
 * mailbox). The cron route runs hourly; `isDigestDue` alone decides whether
 * this hour is the one to send, so the rule can be unit-tested.
 */
import type { OverviewKpis } from "./chapter-overview";

export const DIGEST_SECTIONS = ["members", "articles", "events", "assistant", "operations"] as const;
export type DigestSection = (typeof DIGEST_SECTIONS)[number];
export type DigestSections = Record<DigestSection, boolean>;

export const DEFAULT_SECTIONS: DigestSections = {
  members: true,
  articles: true,
  events: true,
  assistant: true,
  operations: true,
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
    /** Members absent from the ICF feed, now in the grace window (not yet gone). */
    enteredGrace: DigestList;
    /** Members actually removed: grace expired and the record was anonymised. */
    left: DigestList;
    /** A new ICF record whose name matches a record that dropped into grace. */
    idChanges: DigestList;
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
  /** Operational structure change log: volunteer assignments and removals. */
  operations?: { assigned: number; unassigned: number; entries: DigestList };
  overviewUrl: string;
};

/** Caps a list and records how many were cut. */
export function capList(items: DigestListItem[], cap = DIGEST_LIST_CAP): DigestList {
  return { items: items.slice(0, cap), more: Math.max(0, items.length - cap), total: items.length };
}

/** Window in which a new record and a dropped record count as one ICF ID change. */
export const ID_CHANGE_WINDOW_DAYS = 30;

export type DigestMemberRow = {
  id: string;
  fullName: string | null;
  activityState: string;
  createdAt: string;
};

export type DigestGraceRow = { memberId: string; enteredGraceAt: string };

export type IdChangePair = { newId: string; oldId: string; name: string };

/** Lowercase, accent-free, single-spaced name used only to suggest a pairing. */
export function normaliseName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds likely ICF ID changes: ICF Global issues a new record (new ICF ID)
 * while the old one drops out of the feed into the grace window. Without
 * this, the board sees one person as both "new" and "entered grace".
 *
 * Pairs an active record with a grace record of the same name when the active
 * one was created within ID_CHANGE_WINDOW_DAYS of the other entering grace,
 * or when a member new in this period shares a name with a record that is in
 * grace now. Display-only: it never merges or rebinds records.
 */
export function detectIdChanges(
  newMemberIds: string[],
  grace: DigestGraceRow[],
  candidates: DigestMemberRow[],
): IdChangePair[] {
  const byName = new Map<string, DigestMemberRow[]>();
  for (const c of candidates) {
    const key = normaliseName(c.fullName);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), c]);
  }
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const pairs = new Map<string, IdChangePair>();
  const add = (n: DigestMemberRow, o: DigestMemberRow) =>
    pairs.set(`${n.id}:${o.id}`, { newId: n.id, oldId: o.id, name: n.fullName ?? "Member" });
  const windowMs = ID_CHANGE_WINDOW_DAYS * 86_400_000;

  for (const g of grace) {
    const old = byId.get(g.memberId);
    if (!old) continue;
    for (const c of byName.get(normaliseName(old.fullName)) ?? []) {
      if (c.id === old.id || c.activityState !== "active") continue;
      const gap = Math.abs(Date.parse(c.createdAt) - Date.parse(g.enteredGraceAt));
      if (gap <= windowMs) add(c, old);
    }
  }
  for (const id of newMemberIds) {
    const n = byId.get(id);
    if (!n) continue;
    for (const c of byName.get(normaliseName(n.fullName)) ?? []) {
      if (c.id !== n.id && c.activityState === "grace") add(n, c);
    }
  }
  return [...pairs.values()];
}
