/**
 * Server-side state machine, pricing and activation for advertising requests.
 *
 * The transition table here is mirrored by `tg_ads_transition_guard` in the
 * database, so a direct API call cannot skip review or activate a placement
 * without a contract signed by both parties. Prices are always recomputed
 * here from the active rate card; nothing the browser sends is trusted.
 */
import { computePrice, activeWindow } from "./ads-pricing";
import { resolveEligibility, assertSchoolAttestation } from "./ads-eligibility.server";
import type {
  AdEligibilityTier,
  AdPlacementType,
  AdRateCard,
  AdRequest,
  AdRequestStatus,
  AdSelection,
} from "./ads";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

/** The ad schema is staged in drafts and does not exist until the draft is accepted. */
export function isMissingAdSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  if (candidate.code === "PGRST205" || candidate.code === "42P01") return true;
  return (
    typeof candidate.message === "string" &&
    /Could not find the table 'public\.ad_(?:rate_cards|requests|placements)' in the schema cache/i.test(
      candidate.message,
    )
  );
}

export type AdTransition =
  | { action: "submit" }
  | { action: "start_review" }
  | {
      action: "approve";
      price?: number;
      tier?: AdEligibilityTier;
      startDate?: string;
      endDate?: string;
    }
  | { action: "decline"; reason: string }
  | { action: "send_contract" }
  | { action: "mark_signed" }
  | { action: "activate" }
  | { action: "expire" }
  | { action: "cancel" };

const LEGAL_FROM: Record<AdTransition["action"], AdRequestStatus[]> = {
  submit: ["draft"],
  start_review: ["submitted"],
  approve: ["submitted", "under_review"],
  decline: ["submitted", "under_review"],
  send_contract: ["approved"],
  mark_signed: ["approved", "contract_sent"],
  activate: ["contract_signed"],
  expire: ["active"],
  cancel: [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "contract_sent",
    "contract_signed",
    "active",
  ],
};

const REQUEST_COLUMNS =
  "id, offer_type, package, placements, duration_months, newsletter_mentions, eligibility_tier, eligibility_source, eligibility_detail, school_attestation, advertiser_name, contact_email, logo_path, description_de, description_fr, description_it, description_en, cta_url, announcement_date, requested_start, computed_price, currency, status, staff_notes, decline_reason, submitted_at, approved_at, active_from, active_until, created_at, created_by, requester_kind";

export async function loadActiveRateCard(client: Client): Promise<AdRateCard> {
  const { data, error } = await client
    .from("ad_rate_cards")
    .select(
      "id, version, currency, packages, eannouncement_prices, school_prices, newsletter_mentions_guard",
    )
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active rate card is configured.");
  return data as AdRateCard;
}

function selectionOf(row: {
  offer_type: AdSelection["offerType"];
  package: string | null;
  placements: AdPlacementType[] | null;
  duration_months: number | null;
}): AdSelection {
  return {
    offerType: row.offer_type,
    package: (row.package as AdSelection["package"]) ?? null,
    placements: row.placements ?? [],
    durationMonths: row.duration_months,
  };
}

async function logEvent(
  client: Client,
  requestId: string,
  actor: string | null,
  event: string,
  detail: Record<string, unknown> = {},
) {
  await client.from("ad_request_events").insert({
    request_id: requestId,
    actor_user_id: actor,
    event,
    detail,
  });
}

/**
 * Member-side submit: derives eligibility, checks the schools attestation,
 * prices the request from the active rate card and moves it to `submitted`.
 */
export async function submitRequest(
  client: Client,
  admin: Client,
  userId: string,
  requestId: string,
): Promise<AdRequest> {
  const { data, error } = await client
    .from("ad_requests")
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Request not found.");
  const row = data as AdRequest;
  if (!LEGAL_FROM.submit.includes(row.status)) {
    throw new Error("This request has already been submitted.");
  }
  if (row.offer_type === "school") assertSchoolAttestation(row.school_attestation);

  const eligibility = await resolveEligibility(client, userId);
  const rateCard = await loadActiveRateCard(client);
  const price = computePrice(rateCard, selectionOf(row), eligibility.tier);
  if (!price.ok) throw new Error("This configuration has no price in the current rate card.");

  const { data: updated, error: updateError } = await admin
    .from("ad_requests")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      member_id: eligibility.memberId,
      eligibility_tier: eligibility.tier,
      eligibility_source: "derived",
      eligibility_detail: eligibility.detail,
      computed_price: price.amount,
      currency: price.currency,
      rate_card_id: rateCard.id,
    })
    .eq("id", requestId)
    .select(REQUEST_COLUMNS)
    .single();
  if (updateError) throw updateError;

  await logEvent(admin, requestId, userId, "submitted", {
    price: price.amount,
    tier: eligibility.tier,
  });
  return updated as AdRequest;
}

/** Staff-side transitions. `admin` is only reached after a role check. */
export async function transitionRequest(
  admin: Client,
  actorId: string,
  requestId: string,
  transition: AdTransition,
): Promise<AdRequest> {
  const { data, error } = await admin
    .from("ad_requests")
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Request not found.");
  const row = data as AdRequest;

  if (!LEGAL_FROM[transition.action].includes(row.status)) {
    throw new Error(`That change is not possible while the request is "${row.status}".`);
  }

  const now = new Date().toISOString();
  let patch: Record<string, unknown> = {};

  if (transition.action === "start_review") {
    patch = { status: "under_review", reviewed_at: now };
  } else if (transition.action === "approve") {
    const rateCard = await loadActiveRateCard(admin);
    const tier = transition.tier ?? row.eligibility_tier ?? "icf_global";
    const recomputed = computePrice(rateCard, selectionOf(row), tier);
    const price =
      typeof transition.price === "number"
        ? transition.price
        : recomputed.ok
          ? recomputed.amount
          : row.computed_price;
    const start = transition.startDate ?? row.requested_start ?? now.slice(0, 10);
    const window = activeWindow({
      offerType: row.offer_type,
      startDate: start,
      durationMonths: row.duration_months,
      announcementDate: row.announcement_date,
      staffEndDate: transition.endDate ?? null,
    });
    patch = {
      status: "approved",
      approved_at: now,
      reviewed_at: row.status === "under_review" ? undefined : now,
      computed_price: price,
      eligibility_tier: tier,
      eligibility_source: transition.tier ? "staff_override" : row.eligibility_source,
      active_from: window.from,
      active_until: window.until,
      decline_reason: null,
    };
  } else if (transition.action === "decline") {
    patch = { status: "declined", reviewed_at: now, decline_reason: transition.reason };
  } else if (transition.action === "send_contract") {
    await ensureContract(admin, row);
    patch = { status: "contract_sent", contract_sent_at: now };
  } else if (transition.action === "mark_signed") {
    await ensureContract(admin, row);
    await admin
      .from("ad_contracts")
      .update({ signed_at_advertiser: now, signed_at_icf: now })
      .eq("request_id", requestId);
    patch = { status: "contract_signed" };
  } else if (transition.action === "activate") {
    await createPlacements(admin, row);
    patch = { status: "active" };
  } else if (transition.action === "expire") {
    await admin.from("ad_placements").update({ is_active: false }).eq("request_id", requestId);
    patch = { status: "expired" };
  } else {
    await admin.from("ad_placements").update({ is_active: false }).eq("request_id", requestId);
    patch = { status: "cancelled" };
  }

  const { data: updated, error: updateError } = await admin
    .from("ad_requests")
    .update(patch)
    .eq("id", requestId)
    .select(REQUEST_COLUMNS)
    .single();
  if (updateError) throw updateError;

  await logEvent(admin, requestId, actorId, transition.action, {
    from: row.status,
    to: (updated as AdRequest).status,
    ...("reason" in transition ? { reason: transition.reason } : {}),
  });
  return updated as AdRequest;
}

/** One contract per request, generated on approval and printed by staff. */
export async function ensureContract(admin: Client, row: AdRequest) {
  const { data } = await admin
    .from("ad_contracts")
    .select("id")
    .eq("request_id", row.id)
    .maybeSingle();
  if (data) return;
  await admin.from("ad_contracts").insert({
    request_id: row.id,
    advertiser_name: row.advertiser_name ?? "",
    price: row.computed_price,
    currency: row.currency,
  });
}

/**
 * Turn an approved, signed request into the placements the public site reads.
 * An e-announcement produces exactly one row; a package produces one per
 * included placement.
 */
export async function createPlacements(admin: Client, row: AdRequest) {
  const { data: existing } = await admin
    .from("ad_placements")
    .select("id")
    .eq("request_id", row.id)
    .limit(1);
  if (existing && existing.length > 0) return;

  const start = row.active_from ?? new Date().toISOString().slice(0, 10);
  const end = row.active_until ?? start;

  let types: AdPlacementType[];
  if (row.offer_type === "eannouncement") {
    types = ["eannouncement"];
  } else if (row.offer_type === "partner_package") {
    const rateCard = await loadActiveRateCard(admin);
    types = rateCard.packages[row.package ?? ""]?.placements ?? [];
  } else {
    types = row.placements;
  }

  if (types.length === 0) throw new Error("This request includes no placements.");

  const rows = types.map((placement_type) => ({
    request_id: row.id,
    placement_type,
    advertiser_name: row.advertiser_name ?? "",
    description_de: row.description_de,
    description_fr: row.description_fr,
    description_it: row.description_it,
    description_en: row.description_en,
    cta_url: row.cta_url,
    logo_path: row.logo_path,
    start_date: start,
    end_date: end,
    is_active: true,
  }));
  const { error } = await admin.from("ad_placements").insert(rows);
  if (error) throw error;
}

export { REQUEST_COLUMNS };
