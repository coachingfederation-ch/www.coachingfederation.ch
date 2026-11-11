/**
 * Stable references for CMS images in the private article-images bucket.
 *
 * Article covers, community covers and newsletter block images used to be
 * stored as 10-year signed storage URLs. Such a URL is a bearer capability: it
 * keeps working after the article, community or edition is withdrawn. They are
 * now stored as a same-origin media reference (`/api/public/media/<path>`).
 * The media route re-checks, on every request, that the owning row is still
 * public before redirecting to a short-lived signed URL; staff editors sign
 * the path in the browser through storage RLS instead.
 *
 * Rows written before this change still hold the legacy signed URL. Every
 * public reader passes the stored value through `toPublicMediaUrl`, which
 * maps a legacy URL onto the same reference, so the long-lived token never
 * leaves the server again.
 *
 * Client-safe: string helpers only, no Supabase client.
 */
import { ARTICLE_IMAGE_BUCKET } from "./storage";

/** Path prefix of the media route. Stored values start with this. */
export const MEDIA_ROUTE_PREFIX = "/api/public/media/";

/**
 * Storage paths the media route may serve. Anything else in the bucket
 * (speaker photos, stray uploads) is never reachable through it.
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FILE = "[A-Za-z0-9][A-Za-z0-9._-]{0,120}";
const ARTICLE_PATH = new RegExp(`^(${UUID})/${FILE}$`);
const COMMUNITY_PATH = new RegExp(`^communities/(${UUID})(?:/${FILE}|-[0-9]{1,16}\\.png)$`);
const NEWSLETTER_PATH = new RegExp(`^newsletters/(${UUID})/${FILE}$`);

export type MediaOwner =
  | { kind: "article"; id: string }
  | { kind: "community"; id: string }
  | { kind: "newsletter"; id: string };

/** Which row a storage path belongs to, or null when the route must refuse it. */
export function mediaOwnerOf(path: string): MediaOwner | null {
  if (path.includes("..")) return null;
  let m = COMMUNITY_PATH.exec(path);
  if (m?.[1]) return { kind: "community", id: m[1] };
  m = NEWSLETTER_PATH.exec(path);
  if (m?.[1]) return { kind: "newsletter", id: m[1] };
  m = ARTICLE_PATH.exec(path);
  if (m?.[1]) return { kind: "article", id: m[1] };
  return null;
}

/** The stored reference for a freshly uploaded or generated object. */
export function mediaRefForPath(path: string): string {
  return MEDIA_ROUTE_PREFIX + path.split("/").map(encodeURIComponent).join("/");
}

function decodePath(raw: string): string | null {
  try {
    return raw
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

const LEGACY_SIGNED = `/storage/v1/object/sign/${ARTICLE_IMAGE_BUCKET}/`;

/**
 * Storage path behind a stored value: a media reference (relative or absolute)
 * or a legacy signed URL of the article-images bucket. Null for anything else,
 * e.g. Unsplash or a pasted external URL.
 */
export function mediaPathOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith(MEDIA_ROUTE_PREFIX))
    return decodePath(value.slice(MEDIA_ROUTE_PREFIX.length).split(/[?#]/)[0] ?? "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.pathname.startsWith(MEDIA_ROUTE_PREFIX))
    return decodePath(url.pathname.slice(MEDIA_ROUTE_PREFIX.length));
  if (url.pathname.startsWith(LEGACY_SIGNED))
    return decodePath(url.pathname.slice(LEGACY_SIGNED.length));
  return null;
}

/**
 * The value a public page may render: bucket images become the media
 * reference, everything else (external images) passes through unchanged.
 */
export function toPublicMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = mediaPathOf(value);
  return path ? mediaRefForPath(path) : value;
}

/** Absolute form for places that cannot resolve relative URLs (email, og:image). */
export function toAbsoluteMediaUrl(
  value: string | null | undefined,
  origin: string,
): string | null {
  const publicValue = toPublicMediaUrl(value);
  if (!publicValue) return null;
  return publicValue.startsWith("/") ? `${origin.replace(/\/$/, "")}${publicValue}` : publicValue;
}
