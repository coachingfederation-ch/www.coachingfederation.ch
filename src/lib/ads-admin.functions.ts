/**
 * Staff RPC surface for advertising requests: the review queue, the decision
 * transitions, the rate card, and placement upkeep.
 *
 * Every handler passes `assertPlatformAdmin` first. Reads and writes then use
 * the admin client because a request spans member data, contracts and
 * placements that no single staff RLS policy exposes as one view — the gate
 * here is the boundary, and each call is written to `ad_request_events`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin, type AuthedContext } from "./authz";
import type { AdPlacement, AdRateCard, AdRequest, AdRequestEvent, AdRequestStatus } from "./ads";

const idSchema = z.object({ id: z.string().uuid() });

export type AdContract = {
  id: string;
  request_id: string;
  advertiser_name: string;
  price: number;
  currency: string;
  payment_terms: string;
  advertiser_address: string | null;
  signed_at_advertiser: string | null;
  signed_at_icf: string | null;
  created_at: string;
};

const CONTRACT_COLUMNS =
  "id, request_id, advertiser_name, advertiser_address, price, currency, payment_terms, signed_at_advertiser, signed_at_icf, created_at";

export const listAdRequestsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ statuses: z.array(z.string()).optional() }).parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<AdRequest[] | null> => {
    await assertPlatformAdmin(context as AuthedContext);
    const { REQUEST_COLUMNS, isMissingAdSchemaError } = await import("./ads.server");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    let query = supabaseAdmin
      .from("ad_requests")
      .select(REQUEST_COLUMNS)
      .neq("status", "draft")
      .order("submitted_at", { ascending: false });
    if (data.statuses?.length) query = query.in("status", data.statuses);
    const { data: rows, error } = await query;
    if (error) {
      if (isMissingAdSchemaError(error)) return null;
      throw error;
    }
    return (rows ?? []) as AdRequest[];
  });

export type AdRequestDetail = {
  request: AdRequest;
  contract: AdContract | null;
  placements: AdPlacement[];
  events: AdRequestEvent[];
  logoUrl: string | null;
};

export const getAdRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }): Promise<AdRequestDetail> => {
    await assertPlatformAdmin(context as AuthedContext);
    const { REQUEST_COLUMNS } = await import("./ads.server");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const { AD_MEDIA_BUCKET, AD_MEDIA_TTL_SECONDS } = await import("./storage");
    const { signStoragePaths } = await import("./storage.server");

    const { data: request, error } = await supabaseAdmin
      .from("ad_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!request) throw new Error("Request not found.");

    const [contract, placements, events] = await Promise.all([
      supabaseAdmin
        .from("ad_contracts")
        .select(CONTRACT_COLUMNS)
        .eq("request_id", data.id)
        .maybeSingle(),
      supabaseAdmin
        .from("ad_placements")
        .select(
          "id, placement_type, advertiser_name, description_de, description_fr, description_it, description_en, cta_url, logo_path, start_date, end_date",
        )
        .eq("request_id", data.id),
      supabaseAdmin
        .from("ad_request_events")
        .select("id, event, detail, created_at")
        .eq("request_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    const row = request as AdRequest;
    const signed = row.logo_path
      ? await signStoragePaths(AD_MEDIA_BUCKET, [row.logo_path], AD_MEDIA_TTL_SECONDS)
      : null;

    return {
      request: row,
      contract: (contract.data ?? null) as AdContract | null,
      placements: (placements.data ?? []) as AdPlacement[],
      events: (events.data ?? []) as AdRequestEvent[],
      logoUrl: row.logo_path ? (signed?.get(row.logo_path) ?? null) : null,
    };
  });

const transitionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start_review") }),
  z.object({
    action: z.literal("approve"),
    price: z.number().min(0).optional(),
    tier: z.enum(["icfs_member", "icf_global"]).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
  }),
  z.object({ action: z.literal("decline"), reason: z.string().min(3).max(2000) }),
  z.object({ action: z.literal("send_contract") }),
  z.object({ action: z.literal("mark_signed") }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("expire") }),
  z.object({ action: z.literal("cancel") }),
]);

export const transitionAdRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), transition: transitionSchema }).parse(input),
  )
  .handler(async ({ context, data }): Promise<AdRequest> => {
    const actorId = await assertPlatformAdmin(context as AuthedContext);
    const { transitionRequest } = await import("./ads.server");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const row = await transitionRequest(supabaseAdmin, actorId, data.id, data.transition);

    if (data.transition.action === "approve" || data.transition.action === "decline") {
      await notifyAdvertiser(row, data.transition.action === "approve");
    } else if (data.transition.action === "send_contract") {
      await notifyAdvertiserSimple(row, "ad-contract-ready");
    } else if (data.transition.action === "activate") {
      await notifyAdvertiserSimple(row, "ad-placement-live");
    }
    return row;
  });

async function notifyAdvertiser(row: AdRequest, approved: boolean) {
  if (!row.contact_email) return;
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { formatChf } = await import("./ads");
    const { SITE_URL } = await import("@/i18n/config");
    await sendTemplateEmail("ad-request-decision", row.contact_email, {
      templateData: {
        approved,
        advertiserName: row.advertiser_name ?? "",
        offerLabel: row.package ? `${row.offer_type} — ${row.package}` : row.offer_type,
        priceLabel: formatChf(row.computed_price, row.currency),
        periodLabel:
          row.active_from && row.active_until ? `${row.active_from} – ${row.active_until}` : "",
        declineReason: row.decline_reason ?? "",
        detailUrl: `${SITE_URL}/member/advertise`,
      },
    });
  } catch {
    // The decision is recorded regardless; staff can re-send from the queue.
  }
}

/** Contract-ready and placement-live share one payload; only the template differs. */
async function notifyAdvertiserSimple(
  row: AdRequest,
  templateName: "ad-contract-ready" | "ad-placement-live",
) {
  if (!row.contact_email) return;
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { formatChf } = await import("./ads");
    const { SITE_URL } = await import("@/i18n/config");
    const period =
      row.active_from && row.active_until ? `${row.active_from} – ${row.active_until}` : "";
    await sendTemplateEmail(templateName, row.contact_email, {
      templateData: {
        advertiserName: row.advertiser_name ?? "",
        offerLabel: row.package ? `${row.offer_type} — ${row.package}` : row.offer_type,
        placementsLabel: row.package ? `${row.offer_type} — ${row.package}` : row.offer_type,
        priceLabel: formatChf(row.computed_price, row.currency),
        periodLabel: period,
        detailUrl: `${SITE_URL}/member/advertise`,
      },
    });
  } catch {
    // The transition is recorded regardless; staff can re-send from the queue.
  }
}

export const updateAdRequestNotesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), notes: z.string().max(4000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context as AuthedContext);
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const { error } = await supabaseAdmin
      .from("ad_requests")
      .update({ staff_notes: data.notes })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Staff edit the contract's commercial detail before sending it. */
export const saveAdContractFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        advertiserAddress: z.string().max(600).nullable().optional(),
        paymentTerms: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context as AuthedContext);
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const patch: Record<string, unknown> = {};
    if (data.advertiserAddress !== undefined) patch["advertiser_address"] = data.advertiserAddress;
    if (data.paymentTerms !== undefined) patch["payment_terms"] = data.paymentTerms;
    const { error } = await supabaseAdmin
      .from("ad_contracts")
      .update(patch)
      .eq("request_id", data.requestId);
    if (error) throw error;
    return { ok: true };
  });

export const getAdRateCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdRateCard | null> => {
    await assertPlatformAdmin(context as AuthedContext);
    const { isMissingAdSchemaError, loadActiveRateCard } = await import("./ads.server");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    try {
      return await loadActiveRateCard(supabaseAdmin);
    } catch (error) {
      if (isMissingAdSchemaError(error)) return null;
      throw error;
    }
  });

/**
 * Saving the rate card writes a new version and flips the active flag, so a
 * request that was already priced keeps pointing at the card it was priced on.
 */
export const saveAdRateCardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        packages: z.record(z.string(), z.unknown()),
        eannouncementPrices: z.record(z.string(), z.number().min(0)),
        schoolPrices: z.record(z.string(), z.record(z.string(), z.number().min(0))),
        newsletterMentionsGuard: z.number().int().min(0).max(60),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<AdRateCard> => {
    const actorId = await assertPlatformAdmin(context as AuthedContext);
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const { loadActiveRateCard } = await import("./ads.server");
    const current = await loadActiveRateCard(supabaseAdmin);

    const { data: inserted, error } = await supabaseAdmin
      .from("ad_rate_cards")
      .insert({
        version: current.version + 1,
        currency: current.currency,
        packages: data.packages,
        eannouncement_prices: data.eannouncementPrices,
        school_prices: data.schoolPrices,
        newsletter_mentions_guard: data.newsletterMentionsGuard,
        is_active: true,
        created_by: actorId,
      })
      .select(
        "id, version, currency, packages, eannouncement_prices, school_prices, newsletter_mentions_guard",
      )
      .single();
    if (error) throw error;

    await supabaseAdmin
      .from("ad_rate_cards")
      .update({ is_active: false })
      .neq("id", (inserted as { id: string }).id);

    return inserted as AdRateCard;
  });

/**
 * Nightly upkeep: retire placements whose window has closed and mark their
 * request expired, so the sponsor band never outlives a contract.
 */
export async function expireFinishedPlacements(admin: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}): Promise<{ expired: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("ad_placements")
    .update({ is_active: false })
    .lt("end_date", today)
    .eq("is_active", true)
    .select("request_id");
  const requestIds = [
    ...new Set(((data ?? []) as { request_id: string }[]).map((r) => r.request_id)),
  ];
  if (requestIds.length) {
    await admin
      .from("ad_requests")
      .update({ status: "expired" satisfies AdRequestStatus })
      .in("id", requestIds)
      .eq("status", "active");
  }
  return { expired: requestIds.length };
}
