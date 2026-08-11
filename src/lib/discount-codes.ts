/**
 * Client-safe discount-code vocabulary.
 *
 * The arithmetic lives here so the panel can preview a price with exactly the
 * same rounding the server and the database trigger apply. It is a preview
 * only — the amount that is charged is always recomputed server-side.
 */
export type DiscountType = "percentage" | "fixed";

export type DiscountFailure =
  | "invalid"
  | "expired"
  | "inactive"
  | "exhausted"
  | "tier"
  | "member_only";

export type DiscountPreview = {
  code: string;
  type: DiscountType;
  value: number;
  discountCents: number;
  finalCents: number;
};

export type DiscountVerdict =
  | { ok: true; preview: DiscountPreview }
  | { ok: false; reason: DiscountFailure };

/** Never below zero, never above the ticket price. Mirrors the SQL guard. */
export function discountCentsFor(type: DiscountType, value: number, priceCents: number) {
  const raw =
    type === "percentage"
      ? Math.floor((priceCents * Math.min(value, 100)) / 100)
      : Math.round(value * 100);
  return Math.min(Math.max(raw, 0), priceCents);
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}
