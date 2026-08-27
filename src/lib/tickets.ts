/**
 * Client-safe ticketing vocabulary.
 *
 * Prices are always cents in CHF and always come from the server; nothing here
 * decides what a visitor is charged, it only formats and labels what the
 * server already resolved.
 */
import type { Locale } from "@/i18n/config";
import type { PublicFormQuestion } from "./event-forms";

export type TierSegment = "member" | "non_member" | "general";

export type PublicTier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  segment: TierSegment;
  seatsRemaining: number | null;
  isSoldOut: boolean;
  sortOrder: number;
};

/** Why the viewer is (or is not) on member pricing — resolved server-side. */
export type MembershipState = "member" | "not_member" | "signed_out";

export type EventTicketing = {
  tiers: PublicTier[];
  /** The event's active registration form, when the organizer configured one. */
  formId: string | null;
  questions: PublicFormQuestion[];
  membership: MembershipState;
  /** Tier the server will use unless the visitor picks another allowed one. */
  defaultTierId: string | null;
  /** The event offers member-invited guest passes. */
  guestPassesAllowed: boolean;
};

type Localised = {
  name?: string | null;
  name_de?: string | null;
  name_fr?: string | null;
  name_it?: string | null;
};

/** Picks the locale column with a fall back to the source language text. */
export function localisedText(
  row: Record<string, string | null | undefined>,
  base: string,
  locale: Locale,
): string | null {
  const fallback = row[base] ?? null;
  if (locale === "en") return fallback;
  return row[`${base}_${locale}`] || fallback;
}

export function localisedName(row: Localised, locale: Locale): string {
  return localisedText(row as Record<string, string | null | undefined>, "name", locale) ?? "";
}

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

/** "CHF 45.00", or the free label when the tier costs nothing. */
export function formatPrice(cents: number, currency: string, locale: Locale, freeLabel: string) {
  if (cents <= 0) return freeLabel;
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function memberTier(tiers: PublicTier[]) {
  return tiers.find((t) => t.segment === "member") ?? null;
}

export function nonMemberTier(tiers: PublicTier[]) {
  return tiers.find((t) => t.segment === "non_member") ?? null;
}

/**
 * Which tiers this viewer may pick. The member tier is off limits without a
 * confirmed membership — the server enforces the same rule, this only keeps
 * the UI honest.
 */
export function selectableTiers(tiers: PublicTier[], membership: MembershipState) {
  return tiers.filter((t) => t.segment !== "member" || membership === "member");
}
