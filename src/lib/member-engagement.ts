/**
 * Member engagement campaigns — shared, client-safe definitions.
 *
 * The four lifecycle emails triggered by what the ICF member sync detects.
 * The wording lives with every other email in `src/lib/email-templates/`; this
 * module owns the vocabulary both the admin panel and the server dispatcher
 * agree on (keys, modes, send states).
 */

export const ENGAGEMENT_CAMPAIGN_KEYS = [
  "welcome_new_member",
  "credential_upgrade",
  "credential_specialisation",
  "grace_reengagement",
] as const;

export type EngagementCampaignKey = (typeof ENGAGEMENT_CAMPAIGN_KEYS)[number];

export type EngagementMode = "off" | "automatic" | "queued";
export type EngagementSendStatus = "pending" | "sent" | "skipped" | "suppressed" | "failed";

export type EngagementCampaign = {
  key: EngagementCampaignKey;
  mode: EngagementMode;
  daily_cap: number;
  updated_at: string;
};

export type EngagementSend = {
  id: string;
  campaign_key: EngagementCampaignKey;
  member_id: string;
  status: EngagementSendStatus;
  trigger_details: Record<string, unknown>;
  error_message: string | null;
  released_at: string | null;
  sent_at: string | null;
  created_at: string;
};

/**
 * Campaigns with no source data in the ICF feed today. Their email exists and
 * can be previewed, but detection never produces a send for them — enabling
 * one would otherwise look like a silent failure.
 */
export const DORMANT_CAMPAIGNS: readonly EngagementCampaignKey[] = ["credential_specialisation"];

export function isDormant(key: EngagementCampaignKey): boolean {
  return DORMANT_CAMPAIGNS.includes(key);
}

/** Ordered credential ladder; only forward moves are treated as an upgrade. */
export const CREDENTIAL_LADDER = ["ACC", "PCC", "MCC"] as const;

export function credentialRank(slug: string | null | undefined): number {
  if (!slug) return -1;
  return (CREDENTIAL_LADDER as readonly string[]).indexOf(slug.toUpperCase());
}
