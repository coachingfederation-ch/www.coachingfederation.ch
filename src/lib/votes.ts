/**
 * Member votes: shared, client-safe rules.
 *
 * A vote's phase is derived from its status and dates — no job flips it — so
 * the page, the server and the database (`cast_vote`) all agree on whether a
 * ballot may be cast right now.
 */
import type { Locale } from "@/i18n/config";

export type VoteStatus = "draft" | "published" | "archived";
export type VotePhase = "draft" | "scheduled" | "open" | "closed" | "archived";
export type ResultsMode = "after_vote" | "after_close";
export type VoteOption = { key: string; label: string; label_de?: string; label_fr?: string; label_it?: string };

export function voteOptionLabel(option: VoteOption, locale: Locale): string {
  return (locale === "en" ? "" : option[`label_${locale}`]?.trim()) || option.label;
}

export const DEFAULT_OPTIONS: VoteOption[] = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "abstain", label: "Abstain" },
];

export const RATIONALE_MAX = 500;

export function votePhase(
  v: { status: VoteStatus; opens_at: string; closes_at: string },
  now: Date = new Date(),
): VotePhase {
  if (v.status === "draft") return "draft";
  if (v.status === "archived") return "archived";
  const t = now.getTime();
  if (t < new Date(v.opens_at).getTime()) return "scheduled";
  if (t >= new Date(v.closes_at).getTime()) return "closed";
  return "open";
}

/** Default window: the first of next month, open for 30 days. */
export function defaultWindow(now: Date = new Date()): { opens_at: string; closes_at: string } {
  const open = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6, 0, 0));
  const close = new Date(open.getTime() + 30 * 86_400_000);
  return { opens_at: open.toISOString(), closes_at: close.toISOString() };
}

/** Whole days left until close, never negative. */
export function daysLeft(closesAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(closesAt).getTime() - now.getTime()) / 86_400_000));
}

/** Option keys are stable identifiers derived from the label. */
export function optionKey(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "option";
  let key = base;
  let i = 2;
  while (taken.includes(key)) key = `${base}-${i++}`;
  return key;
}

export function validOptions(options: VoteOption[]): boolean {
  const keys = options.map((o) => o.key);
  return (
    options.length >= 2 &&
    options.length <= 10 &&
    new Set(keys).size === keys.length &&
    options.every((o) => o.key.trim() !== "" && o.label.trim() !== "")
  );
}

/** Picks the translated field, falling back to the English master. */
export function localized<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  const tr = locale === "en" ? null : (row[`${field}_${locale}`] as string | null | undefined);
  return (tr && tr.trim()) || ((row[field] as string | null | undefined) ?? "");
}

/** Share of eligible members who voted, one decimal. */
export function turnoutPercent(participants: number, eligible: number): number {
  if (!eligible) return 0;
  return Math.round((participants / eligible) * 1000) / 10;
}

/** Rationales are member-supplied: never let a spreadsheet evaluate them. */
export function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Maps the database's error codes to a translation key suffix. */
export function castErrorKey(message: string): string {
  for (const code of [
    "not_eligible",
    "not_available",
    "not_open",
    "invalid_option",
    "already_voted",
    "rationale_too_long",
  ]) {
    if (message.includes(code)) return code;
  }
  return "generic";
}
