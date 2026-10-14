/**
 * Member-facing server functions for "Advertise with us", plus the one public
 * read the homepage sponsor band uses.
 *
 * Everything commercial is server-owned: the member sends a configuration, the
 * server derives eligibility, prices it from the active rate card and stores
 * the result. The wizard displays that price; it never sends one.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAnyRole, type AuthedContext } from "./authz";
import type { AdEligibility, AdPlacement, AdPlacementType, AdRateCard, AdRequest } from "./ads";

const placementEnum = z.enum([
  "homepage",
  "event_banner",
  "newsletter",
  "square_advert",
  "eannouncement",
]);

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  offerType: z.enum(["partner_package", "eannouncement", "school"]),
  package: z.enum(["gold", "silver", "bronze"]).nullable().optional(),
  placements: z.array(placementEnum).default([]),
  durationMonths: z.number().int().positive().nullable().optional(),
  newsletterMentions: z.number().int().min(0).max(60).default(0),
  schoolAttestation: z
    .object({
      organisation: z.string().max(200),
      programType: z.string().max(200),
      accreditationReference: z.string().max(200),
    })
    .nullable()
    .optional(),
  advertiserName: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().max(200).nullable().optional(),
  logoPath: z.string().max(400).nullable().optional(),
  descriptionDe: z.string().max(600).nullable().optional(),
  descriptionFr: z.string().max(600).nullable().optional(),
  descriptionIt: z.string().max(600).nullable().optional(),
  descriptionEn: z.string().max(600).nullable().optional(),
  // Advertisers often type "example.ch"; add https:// before validating.
  ctaUrl: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }, z.string().url().max(400).nullable().optional()),
  announcementDate: z.string().date().nullable().optional(),
  requestedStart: z.string().date().nullable().optional(),
});

async function isMemberCaller(context: AuthedContext): Promise<boolean> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "member");
  return (data ?? []).length > 0;
}

export type AdvertiseCatalogue = {
  rateCard: AdRateCard;
  eligibility: AdEligibility;
};

/** Offer catalogue + the caller's derived eligibility, for the wizard. */
export const getAdvertiseCatalogue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdvertiseCatalogue | null> => {
    await assertAnyRole(context as AuthedContext, ["member", "advertiser", "admin", "administrator"]);
    const { isMissingAdSchemaError, loadActiveRateCard } = await import("./ads.server");
    const { resolveEligibility } = await import("./ads-eligibility.server");
    let rateCard: AdRateCard;
    try {
      rateCard = await loadActiveRateCard(context.supabase);
    } catch (error) {
      if (isMissingAdSchemaError(error)) return null;
      throw error;
    }
    const { memberId: _memberId, ...eligibility } = await resolveEligibility(
      context.supabase,
      context.userId,
    );
    return { rateCard, eligibility };
  });

export const listMyAdRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdRequest[]> => {
    await assertAnyRole(context as AuthedContext, ["member", "advertiser", "admin", "administrator"]);
    const { isMissingAdSchemaError, REQUEST_COLUMNS } = await import("./ads.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const { data, error } = await db
      .from("ad_requests")
      .select(REQUEST_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingAdSchemaError(error)) return [];
      throw error;
    }
    return (data ?? []) as AdRequest[];
  });

/** Create or update a draft. Only drafts are writable — RLS enforces that. */
export const saveAdRequestDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => draftSchema.parse(input))
  .handler(async ({ context, data }): Promise<AdRequest> => {
    await (await import("./feature-flags.server")).requireFeature("advertising");
    await assertAnyRole(context as AuthedContext, ["member", "advertiser", "admin", "administrator"]);
    const { REQUEST_COLUMNS } = await import("./ads.server");
    const payload = {
      offer_type: data.offerType,
      package: data.package ?? null,
      placements: data.placements,
      duration_months: data.durationMonths ?? null,
      newsletter_mentions: data.newsletterMentions,
      school_attestation: data.schoolAttestation
        ? { ...data.schoolAttestation, attestedAt: new Date().toISOString() }
        : null,
      advertiser_name: data.advertiserName ?? null,
      contact_email: data.contactEmail ?? null,
      logo_path: data.logoPath ?? null,
      description_de: data.descriptionDe ?? null,
      description_fr: data.descriptionFr ?? null,
      description_it: data.descriptionIt ?? null,
      description_en: data.descriptionEn ?? null,
      cta_url: data.ctaUrl ?? null,
      announcement_date: data.announcementDate ?? null,
      requested_start: data.requestedStart ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any;
    const query = data.id
      ? db.from("ad_requests").update(payload).eq("id", data.id)
      : db.from("ad_requests").insert({
          ...payload,
          created_by: context.userId,
          // Server-set: who placed it decides how staff verify the requester.
          requester_kind: (await isMemberCaller(context as AuthedContext)) ? "member" : "external",
        });

    const { data: row, error } = await query.select(REQUEST_COLUMNS).single();
    if (error) throw error;
    return row as AdRequest;
  });

export const submitAdRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<AdRequest> => {
    await (await import("./feature-flags.server")).requireFeature("advertising");
    await assertAnyRole(context as AuthedContext, ["member", "advertiser", "admin", "administrator"]);
    const { submitRequest } = await import("./ads.server");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const row = await submitRequest(context.supabase, supabaseAdmin, context.userId, data.id);
    await notifyStaffOfSubmission(row);
    return row;
  });

async function notifyStaffOfSubmission(row: AdRequest) {
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { formatChf } = await import("./ads");
    const { SITE_URL } = await import("@/i18n/config");
    await sendTemplateEmail("ad-request-submitted", "office@coachingfederation.ch", {
      templateData: {
        advertiserName: row.advertiser_name ?? "An advertiser",
        offerLabel: row.offer_type,
        priceLabel: formatChf(row.computed_price, row.currency),
        eligibilityLabel: row.eligibility_tier ?? "Not determined",
        reviewUrl: `${SITE_URL}/manage/ad-requests`,
      },
    });
  } catch {
    // A notification failure must never lose a submitted request.
  }
}

/**
 * Logo upload. Members never write to storage directly: the file arrives as a
 * data URL, is size- and type-checked here, and is written under the caller's
 * own folder with the admin client.
 */
export const uploadAdLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fileName: z.string().max(200),
        contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
        dataBase64: z.string().max(4_000_000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ path: string }> => {
    await assertAnyRole(context as AuthedContext, ["member", "advertiser", "admin", "administrator"]);
    const { AD_MEDIA_BUCKET } = await import("./storage");
    const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
    // The ad_* tables arrive with the staged migration, so they are absent from
    // the generated types until it is applied; this alias keeps the module typed
    // loosely for those tables only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin = adminClient as any;
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 2_000_000) throw new Error("The logo must be smaller than 2 MB.");
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const path = `${context.userId}/${Date.now()}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from(AD_MEDIA_BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw error;
    return { path };
  });

export type PublicPlacement = AdPlacement & { logoUrl: string | null };

/**
 * Live placements for a public surface. Unauthenticated on purpose: the policy
 * only exposes rows that are active and inside their date window, and only the
 * fields that appear on the card.
 */
export const listActivePlacements = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ placementType: placementEnum.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<PublicPlacement[]> => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const publicDb = () => publicSupabaseClient() as any;
    const { AD_MEDIA_BUCKET, AD_MEDIA_TTL_SECONDS } = await import("./storage");
    const { signStoragePaths } = await import("./storage.server");

    let query = publicDb()
      .from("ad_placements")
      .select(
        "id, placement_type, advertiser_name, description_de, description_fr, description_it, description_en, cta_url, logo_path, start_date, end_date",
      )
      .order("start_date", { ascending: true });
    if (data.placementType) query = query.eq("placement_type", data.placementType);

    const { data: rows, error } = await query;
    if (error) {
      // The advertising tables only exist once the draft is accepted; until then
      // the public homepage must keep rendering its fallback band.
      const { isMissingAdSchemaError } = await import("./ads.server");
      if (isMissingAdSchemaError(error)) return [];
      throw error;
    }

    const placements = (rows ?? []) as AdPlacement[];
    const signed = await signStoragePaths(
      AD_MEDIA_BUCKET,
      placements.map((p) => p.logo_path).filter((p): p is string => Boolean(p)),
      AD_MEDIA_TTL_SECONDS,
    );
    return placements.map((placement) => ({
      ...placement,
      logoUrl: placement.logo_path ? (signed.get(placement.logo_path) ?? null) : null,
    }));
  });

export type { AdPlacementType };
