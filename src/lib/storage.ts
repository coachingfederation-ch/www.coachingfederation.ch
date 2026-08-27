/**
 * Storage buckets and signed-URL lifetimes — the single place these values are
 * declared.
 *
 * Both buckets are private. Nothing is ever served from a public object URL:
 * every read goes through a signed URL minted for a caller that has already
 * passed an access check (the public directory view for coach photos, the
 * staff CMS for article images). Keeping the names and TTLs here means a
 * change to that policy is one edit, not three.
 *
 * This module is client-safe: it holds constants only, no Supabase client.
 * Server-side signing helpers live in `storage.server.ts`.
 */

/** Member profile photos. Private; read via short-lived signed URLs. */
export const PROFILE_IMAGE_BUCKET = "member-profile-images";

/** CMS article images. Private; the signed URL is persisted on the article. */
export const ARTICLE_IMAGE_BUCKET = "article-images";

/**
 * Governance documents (PDFs and similar). Private bucket: public buckets are
 * blocked by workspace policy, so every download link is a short-lived signed
 * URL minted server-side for rows that are already `is_published`.
 */
export const GOVERNANCE_DOCUMENT_BUCKET = "governance-documents";

/**
 * Governance download links: 1h. The archive page re-signs on every render, so
 * a short window is enough and keeps stale links from circulating.
 */
export const GOVERNANCE_DOCUMENT_TTL_SECONDS = 60 * 60;

/**
 * Public directory listings: 24h.
 *
 * The URL only ever leaves the server for rows `coach_directory_public`
 * already cleared as published + eligible, and a day-long window keeps
 * re-signing cost off every page view.
 */
export const PROFILE_IMAGE_TTL_SECONDS = 60 * 60 * 24;

/**
 * A member previewing their own photo in the editor: 1h.
 *
 * Deliberately shorter than the public TTL — this URL is minted in the browser
 * for one editing session, not cached in a rendered page.
 */
export const PROFILE_IMAGE_PREVIEW_TTL_SECONDS = 60 * 60;

/**
 * Article images: 10 years.
 *
 * Known debt. The signed URL is written into `articles.featured_image_url` and
 * rendered on the public site, so it must outlive the article; a long TTL is
 * the stand-in for a public bucket or an image proxy. See docs/tech-debt.md.
 */
export const ARTICLE_IMAGE_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

/**
 * Event media: recap galleries and attendee downloads. Private bucket — the
 * web-sized gallery pictures are signed server-side for everyone, the original
 * photos and the attachments only after an entitlement check.
 */
export const EVENT_MEDIA_BUCKET = "event-media";

/**
 * Recap gallery pictures: 24h.
 *
 * Signed on every render of the event page, so a day-long window is generous
 * while keeping links from outliving an unpublish.
 */
export const EVENT_RECAP_PHOTO_TTL_SECONDS = 60 * 60 * 24;

/**
 * Gated downloads (original photos, attachments): 10 minutes.
 *
 * Minted for one click by a caller we just verified as an attendee or member,
 * so the link must not be shareable in any meaningful way.
 */
export const EVENT_RECAP_DOWNLOAD_TTL_SECONDS = 10 * 60;

/**
 * Uploaded Zoom / Google Meet attendance CSVs. Private bucket, keyed by event:
 * `<event_id>/<import_id>/<filename>`. The files carry attendee email
 * addresses, so only the staff who manage that event may read them.
 */
export const EVENT_ATTENDANCE_IMPORT_BUCKET = "event-attendance-imports";

/** Re-download link for an uploaded attendance file: 10 minutes. */
export const EVENT_ATTENDANCE_IMPORT_TTL_SECONDS = 10 * 60;
