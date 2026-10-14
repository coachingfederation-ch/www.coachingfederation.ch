/**
 * The one place a price is computed.
 *
 * Pure and client-safe so the wizard can preview a price, but the value that
 * is ever stored comes from the server calling the same function: a member can
 * only ever see the number, never choose it. Eligibility is an input, not a
 * selection — see `ads-eligibility.server.ts`.
 */
import { EANNOUNCEMENT_TRAILING_DAYS } from "./ads";
import type { AdEligibilityTier, AdRateCard, AdSelection } from "./ads";

export type PriceResult =
  | { ok: true; amount: number; currency: string }
  | { ok: false; reason: "no_price" };

export function computePrice(
  rateCard: AdRateCard,
  selection: AdSelection,
  eligibility: AdEligibilityTier | null,
): PriceResult {
  const currency = rateCard.currency || "CHF";

  if (selection.offerType === "partner_package") {
    const pkg = selection.package ? rateCard.packages[selection.package] : undefined;
    const price = pkg?.prices?.[String(selection.durationMonths ?? "")];
    return typeof price === "number"
      ? { ok: true, amount: price, currency }
      : { ok: false, reason: "no_price" };
  }

  if (selection.offerType === "eannouncement") {
    // Unknown credential falls back to the higher tier; staff may adjust.
    const tier: AdEligibilityTier = eligibility ?? "icf_global";
    const price = rateCard.eannouncement_prices[tier];
    return typeof price === "number"
      ? { ok: true, amount: price, currency }
      : { ok: false, reason: "no_price" };
  }

  // Schools: one price per selected placement at the chosen duration.
  let total = 0;
  for (const placement of selection.placements) {
    const price = rateCard.school_prices[placement]?.[String(selection.durationMonths ?? "")];
    if (typeof price !== "number") return { ok: false, reason: "no_price" };
    total += price;
  }
  return total > 0 ? { ok: true, amount: total, currency } : { ok: false, reason: "no_price" };
}

/** ISO date, `days` after `from`. */
export function addDays(from: string, days: number): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** ISO date, `months` after `from`. */
export function addMonths(from: string, months: number): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * The active window a request produces once its contract is signed.
 *
 * An e-announcement is a one-off: it runs from its go-live date to the
 * announcement date plus 14 days, unless staff set an explicit end date.
 * Everything else is a duration package.
 */
export function activeWindow(input: {
  offerType: AdSelection["offerType"];
  startDate: string;
  durationMonths: number | null;
  announcementDate: string | null;
  staffEndDate?: string | null;
}): { from: string; until: string } {
  if (input.staffEndDate) return { from: input.startDate, until: input.staffEndDate };
  if (input.offerType === "eannouncement") {
    const anchor = input.announcementDate ?? input.startDate;
    return { from: input.startDate, until: addDays(anchor, EANNOUNCEMENT_TRAILING_DAYS) };
  }
  return {
    from: input.startDate,
    until: addDays(addMonths(input.startDate, input.durationMonths ?? 12), -1),
  };
}
