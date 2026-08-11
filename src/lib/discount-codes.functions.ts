/**
 * Discount codes: one public validation endpoint and the staff CRUD.
 *
 * Staff writes run through `context.supabase`, so "organizers touch only their
 * own events" stays a database decision. The public endpoint answers a verdict
 * and a price only — never an organizer note or a remaining-use count.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import type { DiscountVerdict } from "./discount-codes";

const codeText = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore.");

const validateInput = z.object({
  eventId: z.string().uuid(),
  tierId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
  memberId: z.string().trim().max(60).nullable().optional(),
});

/** Shared body: resolve the tier, then the code, for the given membership. */
async function verdictFor(
  data: z.infer<typeof validateInput>,
  userId: string | null,
  rateSubject: string | null,
): Promise<DiscountVerdict> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveDiscount } = await import("./discount-codes.server");
  const { resolveMembership } = await import("./tickets.server");

  const { data: tier } = await supabaseAdmin
    .from("event_ticket_tiers")
    .select("id, event_id, price_cents, is_active")
    .eq("id", data.tierId)
    .maybeSingle();
  if (!tier || tier.event_id !== data.eventId || !tier.is_active) {
    return { ok: false, reason: "tier" };
  }

  const membership = await resolveMembership(userId, data.memberId ?? null, rateSubject);
  const result = await resolveDiscount(data.eventId, data.code, tier, membership);
  return result.ok ? { ok: true, preview: result.preview } : { ok: false, reason: result.reason };
}

/** Guest-side check. Rate limited per caller; the submit path re-validates. */
export const validateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validateInput.parse(input))
  .handler(async ({ data }): Promise<DiscountVerdict> => {
    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const subject = `ip:${clientIp(getRequest())}`;
    const verdict = await checkRateLimit("event-discount-code", subject, [
      { windowSeconds: 300, max: 20 },
      { windowSeconds: 86_400, max: 200 },
    ]);
    if (!verdict.allowed) return { ok: false, reason: "invalid" };
    return verdictFor(data, null, subject);
  });

/** Same check for a signed-in visitor, so member-only codes can apply. */
export const validateDiscountCodeAsMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validateInput.parse(input))
  .handler(
    async ({ data, context }): Promise<DiscountVerdict> =>
      verdictFor(data, context.userId, `user:${context.userId}`),
  );

const CODE_COLUMNS =
  "id, event_id, code, discount_type, discount_value, is_active, is_archived, starts_at, expires_at, max_uses, tier_ids, member_only, internal_note";

export type ManagedDiscountCode = {
  id: string;
  event_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  is_archived: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  tier_ids: string[];
  member_only: boolean;
  internal_note: string | null;
  used_count: number;
};

export const listEventDiscountCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<ManagedDiscountCode[]> => {
    await assertOrganizer(context);
    const { data: rows, error } = await context.supabase
      .from("event_discount_codes")
      .select(CODE_COLUMNS)
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // The row list is already RLS-scoped to events this account manages; the
    // counts then read registration columns staff do not hold a grant on.
    const { countDiscountUses } = await import("./discount-codes.server");
    const codes = (rows ?? []) as Omit<ManagedDiscountCode, "used_count">[];
    const counts = await Promise.all(codes.map((row) => countDiscountUses(row.id)));
    return codes.map((row, i) => ({
      ...row,
      discount_value: Number(row.discount_value),
      tier_ids: row.tier_ids ?? [],
      used_count: counts[i] ?? 0,
    }));
  });

const saveInput = z.object({
  eventId: z.string().uuid(),
  id: z.string().uuid().nullable().optional(),
  code: codeText,
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive().max(100000),
  is_active: z.boolean(),
  is_archived: z.boolean(),
  starts_at: z.string().min(1).nullable().optional(),
  expires_at: z.string().min(1).nullable().optional(),
  max_uses: z.number().int().positive().max(100000).nullable().optional(),
  tier_ids: z.array(z.string().uuid()).max(12).default([]),
  member_only: z.boolean(),
  internal_note: z.string().trim().max(500).nullable().optional(),
});

export const saveEventDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    if (data.discount_type === "percentage" && data.discount_value > 100) {
      throw new Error("A percentage discount cannot exceed 100.");
    }
    const row = {
      event_id: data.eventId,
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      is_active: data.is_active,
      is_archived: data.is_archived,
      starts_at: data.starts_at ?? null,
      expires_at: data.expires_at ?? null,
      max_uses: data.max_uses ?? null,
      tier_ids: data.tier_ids,
      member_only: data.member_only,
      internal_note: data.internal_note || null,
    };
    const { error } = data.id
      ? await context.supabase.from("event_discount_codes").update(row).eq("id", data.id)
      : await context.supabase
          .from("event_discount_codes")
          .insert({ ...row, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** A code that was already used is archived, never deleted, so the historical
 *  registrations keep pointing at a real row. */
export const deleteEventDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<{ deleted: boolean }> => {
    await assertOrganizer(context);
    const { countDiscountUses } = await import("./discount-codes.server");
    const { data: existing } = await context.supabase
      .from("event_discount_codes")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) throw new Error("Discount code not found.");

    if ((await countDiscountUses(data.id)) > 0) {
      const { error } = await context.supabase
        .from("event_discount_codes")
        .update({ is_archived: true, is_active: false })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { deleted: false };
    }
    const { error } = await context.supabase
      .from("event_discount_codes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
