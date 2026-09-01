/**
 * Member engagement campaigns — shared, client-safe definitions.
 *
 * The four lifecycle emails triggered by what the ICF member sync detects.
 * Copy is authored by staff per campaign per chapter language and stored in
 * `member_engagement_campaigns.copy`; this module owns the vocabulary both
 * the admin panel and the server dispatcher agree on.
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

/** Chapter languages the copy is authored in. */
export const ENGAGEMENT_LOCALES = ["en", "de", "fr", "it"] as const;
export type EngagementLocale = (typeof ENGAGEMENT_LOCALES)[number];

export type EngagementCopy = Partial<Record<EngagementLocale, { subject: string; body: string }>>;

export type EngagementCampaign = {
  key: EngagementCampaignKey;
  mode: EngagementMode;
  daily_cap: number;
  copy: EngagementCopy;
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
 * Campaigns with no source data in the ICF feed today. They can be authored
 * and previewed, but detection never produces a send for them — enabling one
 * would otherwise look like a silent failure.
 */
export const DORMANT_CAMPAIGNS: readonly EngagementCampaignKey[] = ["credential_specialisation"];

export function isDormant(key: EngagementCampaignKey): boolean {
  return DORMANT_CAMPAIGNS.includes(key);
}

/** Placeholders each campaign's copy may use, shown as hints in the editor. */
export const CAMPAIGN_PLACEHOLDERS: Record<EngagementCampaignKey, readonly string[]> = {
  welcome_new_member: ["first_name", "events_link"],
  credential_upgrade: ["first_name", "credential_from", "credential_to"],
  credential_specialisation: ["first_name", "specialisation"],
  grace_reengagement: ["first_name", "grace_end_date", "leader_link"],
};

/** Ordered credential ladder; only forward moves are treated as an upgrade. */
export const CREDENTIAL_LADDER = ["ACC", "PCC", "MCC"] as const;

export function credentialRank(slug: string | null | undefined): number {
  if (!slug) return -1;
  return (CREDENTIAL_LADDER as readonly string[]).indexOf(slug.toUpperCase());
}

/**
 * Substitutes `{{placeholder}}` tokens. An unknown or empty value collapses to
 * an empty string rather than leaking the raw token into a member's inbox.
 */
export function renderCopyText(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, name: string) => vars[name] ?? "");
}

/**
 * Picks the copy to send in. Members have no stored language preference yet,
 * so callers pass what they know and English is the fallback; any authored
 * language is preferred over sending nothing at all.
 */
export function pickCopy(
  copy: EngagementCopy,
  locale?: string | null,
): { subject: string; body: string } | null {
  const candidate = (locale ?? "").slice(0, 2).toLowerCase() as EngagementLocale;
  const entry =
    copy[candidate] ??
    copy.en ??
    ENGAGEMENT_LOCALES.map((l) => copy[l]).find((value) => value?.subject && value.body);
  if (!entry?.subject || !entry.body) return null;
  return entry;
}
