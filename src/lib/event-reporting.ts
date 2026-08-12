/**
 * Client-safe reporting vocabulary.
 *
 * The shapes here cross the server-function boundary, so they hold plain data
 * only: money is always integer cents, dates are always ISO strings, and every
 * percentage is `null` rather than 0 when the denominator does not exist — a
 * missing capacity must never render as a real sell-through of 0%.
 */
export type ReportFilters = {
  /** Tier id, or "all". Free/RSVP rows have no tier and match "none". */
  tier: string;
  /** Registration status: all | confirmed | cancelled. */
  status: string;
  /** Payment status: all | not_required | pending | paid | expired | refunded. */
  payment: string;
  /** all | in | out */
  checkIn: string;
  /** Inclusive yyyy-mm-dd bounds on `created_at`, empty string for open. */
  from: string;
  to: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  tier: "all",
  status: "all",
  payment: "all",
  checkIn: "all",
  from: "",
  to: "",
};

export type ReportGrouping = "day" | "week";

export type ReportKpis = {
  confirmed: number;
  pending: number;
  cancelled: number;
  refunded: number;
  /** Confirmed + settled + not refunded: the people we expect at the door. */
  active: number;
  checkedIn: number;
  /** null when nobody has ever been checked in for this event. */
  noShows: number | null;
  attendanceRate: number | null;
  capacity: number | null;
  remaining: number | null;
  sellThrough: number | null;
  grossCents: number;
  refundCents: number;
  netCents: number;
  freeCount: number;
  currency: string;
};

export type ReportTierRow = {
  id: string;
  name: string;
  isActive: boolean;
  /** null for tiers deleted since; the price snapshot then comes from rows. */
  priceCents: number | null;
  currency: string;
  capacity: number | null;
  confirmed: number;
  remaining: number | null;
  sellThrough: number | null;
  grossCents: number;
  refundCents: number;
  netCents: number;
  checkedIn: number;
};

export type ReportPoint = {
  /** Bucket start, yyyy-mm-dd. */
  date: string;
  confirmed: number;
  paid: number;
  free: number;
  grossCents: number;
  refundCents: number;
  checkedIn: number;
};

export type EventReport = {
  event: {
    id: string;
    title: string;
    startsAt: string | null;
    capacity: number | null;
    registrationMode: string;
  };
  kpis: ReportKpis;
  tiers: ReportTierRow[];
  series: ReportPoint[];
  /** True once at least one attendee has been checked in. */
  hasCheckIns: boolean;
  matched: number;
};

/** Percentage rounded to one decimal, or null when the base is absent. */
export function pct(part: number, whole: number | null): number | null {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

const LOCALE_TAGS: Record<string, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

/**
 * Money for reports. Unlike the public `formatPrice`, zero is a real result
 * here — "CHF 0.00 refunded" is information, not a free ticket.
 */
export function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(LOCALE_TAGS[locale] ?? "en-CH", {
    style: "currency",
    currency: currency || "CHF",
  }).format(cents / 100);
}
