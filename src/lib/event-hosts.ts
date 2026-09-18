/**
 * Shared, client-safe shape for event hosts.
 *
 * A host is always a *published* directory profile, so the public page can
 * link straight to `/coach/<profileId>` without a second eligibility check.
 */
export type EventHost = {
  profileId: string;
  fullName: string;
  tagline: string | null;
  imageUrl: string | null;
  /** Optional per-event link; when set it replaces the coach profile link. */
  linkUrl: string | null;
  /** Optional per-event presentation text shown under the host's name. */
  blurb: string | null;
};

/**
 * Guard rail, not a product limit: an event may list as many hosts as it needs,
 * the ceiling only stops a malformed request writing thousands of rows.
 */
export const MAX_EVENT_HOSTS = 30;

/** Short presentation texts keep the "Hosted by" block scannable. */
export const MAX_HOST_BLURB = 400;
