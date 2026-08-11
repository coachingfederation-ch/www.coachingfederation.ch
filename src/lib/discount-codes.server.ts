/**
 * Discount-code resolution.
 *
 * A code is only ever named by the client; validity, eligibility and the
 * resulting price are decided here and re-checked by
 * `tg_event_registration_guard` when the registration row is written.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { discountCentsFor, normalizeCode, type DiscountType, type DiscountVerdict } from "./discount-codes";
import type { MembershipState } from "./tickets";

export type DiscountRecord = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  member_only: boolean;
  max_uses: number | null;
  tier_ids: string[];
};

/**
 * A use is confirmed registrations plus live 30-minute checkout holds, so a
 * limited code cannot be oversold while someone pays. An abandoned or expired
 * hold stops counting on its own — nothing is permanently consumed.
 */
export async function countDiscountUses(codeId: string) {
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .select("payment_status, hold_expires_at")
    .eq("discount_code_id", codeId)
    .eq("status", "confirmed");
  const now = Date.now();
  return (data ?? []).filter((row) => {
    if (row.payment_status === "not_required" || row.payment_status === "paid") return true;
    if (row.payment_status !== "pending") return false;
    return !row.hold_expires_at || new Date(row.hold_expires_at).getTime() > now;
  }).length;
}

/**
 * Resolves a code against one ticket tier. Returns the price the server will
 * charge, or a stable reason the UI can translate. No organizer-internal
 * detail (notes, remaining uses) ever leaves this function.
 */
export async function resolveDiscount(
  eventId: string,
  codeInput: string,
  tier: { id: string; price_cents: number },
  membership: MembershipState,
): Promise<DiscountVerdict & { record?: DiscountRecord }> {
  const code = normalizeCode(codeInput);
  if (!code) return { ok: false, reason: "invalid" };

  const { data: rows } = await supabaseAdmin
    .from("event_discount_codes")
    .select("id, code, discount_type, discount_value, member_only, max_uses, tier_ids, is_active, is_archived, starts_at, expires_at")
    .eq("event_id", eventId);

  const row = (rows ?? []).find((r) => normalizeCode(r.code) === code);
  if (!row || row.is_archived) return { ok: false, reason: "invalid" };
  if (!row.is_active) return { ok: false, reason: "inactive" };

  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return { ok: false, reason: "expired" };
  if (row.expires_at && new Date(row.expires_at).getTime() < now) return { ok: false, reason: "expired" };

  const tierIds = (row.tier_ids ?? []) as string[];
  if (tierIds.length > 0 && !tierIds.includes(tier.id)) return { ok: false, reason: "tier" };
  if (row.member_only && membership !== "member") return { ok: false, reason: "member_only" };

  if (row.max_uses !== null && (await countDiscountUses(row.id)) >= row.max_uses) {
    return { ok: false, reason: "exhausted" };
  }

  const type = row.discount_type as DiscountType;
  const value = Number(row.discount_value);
  const discountCents = discountCentsFor(type, value, tier.price_cents);
  return {
    ok: true,
    preview: {
      code: row.code,
      type,
      value,
      discountCents,
      finalCents: tier.price_cents - discountCents,
    },
    record: {
      id: row.id,
      code: row.code,
      discount_type: type,
      discount_value: value,
      member_only: row.member_only,
      max_uses: row.max_uses,
      tier_ids: tierIds,
    },
  };
}
