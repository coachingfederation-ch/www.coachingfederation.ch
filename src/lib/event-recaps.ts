/**
 * Shared, client-safe types for the "after event" recap.
 *
 * A recap turns a finished event into an editorial page: a story, a photo
 * gallery, sharing, and downloads that are gated to the people who were there.
 * Only constants and types live here — every read and write goes through
 * `event-recaps.functions.ts` (public) or `event-recaps-admin.functions.ts`
 * (staff), so this module is safe to import from the browser.
 */

/** Who may pull the original photos and the attached files. */
export type RecapAudience = "attendees" | "members" | "public";

export const RECAP_AUDIENCES: RecapAudience[] = ["attendees", "members", "public"];

/** One gallery picture, as rendered on the public page. */
export type RecapPhoto = {
  id: string;
  sort_order: number;
  /** Signed URL of the web-sized rendition. */
  url: string | null;
  caption: string | null;
  alt: string | null;
  is_ai: boolean;
};

/** One attachment, listed publicly but only linked once entitlement is proven. */
export type RecapFile = {
  id: string;
  filename: string;
  label: string | null;
  size_bytes: number | null;
  content_type: string | null;
};

/** The recap as the public event page consumes it. */
export type PublicRecap = {
  id: string;
  headline: string | null;
  body: string | null;
  published_at: string | null;
  downloads_audience: RecapAudience;
  resolvedLocale: string;
  photos: RecapPhoto[];
  /** File metadata only; the URL is minted by a separate, gated call. */
  files: RecapFile[];
  /** True when at least one photo keeps a full-resolution original. */
  hasOriginals: boolean;
};

/** A signed, short-lived download handed to an entitled caller. */
export type RecapDownload = {
  id: string;
  kind: "photo" | "file";
  filename: string;
  url: string;
};

/** Human-readable file size; `null` when the size was never recorded. */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** Storage path for a recap asset. The first folder is the event id — the
 * storage policies read it to decide who may write there. */
export function recapAssetPath(eventId: string, kind: "web" | "original" | "file", name: string) {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  return `${eventId}/recap/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
