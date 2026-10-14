/**
 * Client-safe vocabulary for "Advertise with us".
 *
 * ICF Switzerland curates and approves advertising; it does not sell it
 * self-service. Everything here is shape and naming only — prices live in the
 * `ad_rate_cards` record, and the price a request is finally charged is always
 * the one the server computed.
 */

export type AdOfferType = "partner_package" | "eannouncement" | "school";

export type AdPlacementType =
  | "homepage"
  | "event_banner"
  | "newsletter"
  | "square_advert"
  | "eannouncement";

export type AdRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "declined"
  | "contract_sent"
  | "contract_signed"
  | "active"
  | "expired"
  | "cancelled";

/**
 * Which price tier an e-announcement is charged at. Derived from the member's
 * own membership and credential record — never chosen in the wizard.
 */
export type AdEligibilityTier = "icfs_member" | "icf_global";

export const PARTNER_PACKAGES = ["gold", "silver", "bronze"] as const;
export type PartnerPackage = (typeof PARTNER_PACKAGES)[number];

/** Durations a partner package can be booked for, in months. */
export const PACKAGE_DURATIONS = [12, 6] as const;

/** Durations per school placement, in months. */
export const SCHOOL_DURATIONS: Record<AdPlacementType, number[]> = {
  square_advert: [12, 6, 3],
  newsletter: [12, 6, 3],
  event_banner: [3, 1],
  homepage: [],
  eannouncement: [],
};

export const SCHOOL_PLACEMENTS: AdPlacementType[] = [
  "square_advert",
  "newsletter",
  "event_banner",
];

/** How long an e-announcement stays visible after its announcement date. */
export const EANNOUNCEMENT_TRAILING_DAYS = 14;

export type AdRateCard = {
  id: string;
  version: number;
  currency: string;
  packages: Record<
    string,
    { label: string; placements: AdPlacementType[]; prices: Record<string, number> }
  >;
  eannouncement_prices: Partial<Record<AdEligibilityTier, number>>;
  school_prices: Partial<Record<AdPlacementType, Record<string, number>>>;
  newsletter_mentions_guard: number;
};

export type AdEligibility = {
  tier: AdEligibilityTier;
  /** `derived` from the member record, or `staff_override` set at review. */
  source: "derived" | "staff_override";
  /** What the derivation saw, shown verbatim to staff in the review queue. */
  detail: {
    membershipState?: string | null;
    credential?: string | null;
    credentialExpiresOn?: string | null;
    resolved?: string;
  };
};

export type AdSchoolAttestation = {
  organisation: string;
  programType: string;
  accreditationReference: string;
  attestedAt: string;
};

export type AdSelection = {
  offerType: AdOfferType;
  package: PartnerPackage | null;
  placements: AdPlacementType[];
  durationMonths: number | null;
};

export type AdRequest = {
  id: string;
  /** Account that placed the request. */
  created_by?: string;
  /** "member" (ICF member) or "external" (advertiser account). */
  requester_kind?: "member" | "external";
  offer_type: AdOfferType;
  package: string | null;
  placements: AdPlacementType[];
  duration_months: number | null;
  newsletter_mentions: number;
  eligibility_tier: AdEligibilityTier | null;
  eligibility_source: string;
  eligibility_detail: AdEligibility["detail"];
  school_attestation: AdSchoolAttestation | null;
  advertiser_name: string | null;
  contact_email: string | null;
  logo_path: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  description_en: string | null;
  cta_url: string | null;
  announcement_date: string | null;
  requested_start: string | null;
  computed_price: number;
  currency: string;
  status: AdRequestStatus;
  staff_notes: string | null;
  decline_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  active_from: string | null;
  active_until: string | null;
  created_at: string;
};

export type AdRequestEvent = {
  id: string;
  event: string;
  /** Free-form audit payload; JSON scalars only so it survives serialisation. */
  detail: Record<string, string | number | boolean | null> | null;
  created_at: string;
};

export type AdPlacement = {
  id: string;
  placement_type: AdPlacementType;
  advertiser_name: string;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  description_en: string | null;
  cta_url: string | null;
  logo_path: string | null;
  start_date: string;
  end_date: string;
};

/** Statuses a member still owns; anything else is staff territory. */
export const MEMBER_EDITABLE_STATUSES: AdRequestStatus[] = ["draft"];

export const STATUS_ORDER: AdRequestStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "contract_sent",
  "contract_signed",
  "active",
  "expired",
  "declined",
  "cancelled",
];

/** Formats an integer amount of francs the Swiss way: CHF 2'500. */
export function formatChf(amount: number, currency = "CHF"): string {
  return `${currency} ${Math.round(amount).toLocaleString("de-CH").replace(/\u2019|,/g, "'")}`;
}
