/**
 * Server side of the CMS media route (`/api/public/media/<path>`).
 *
 * Decides, per request, whether an image in the private article-images bucket
 * is still public, and only then mints a short-lived signed URL for it. The
 * decision re-reads the owning row every time, so unpublishing an article,
 * deactivating a community or withdrawing a newsletter cuts the image off at
 * once — unlike the 10-year signed URLs these rows used to store.
 *
 * An image is public when:
 * - article: the article is readable anonymously (status `published`) and the
 *   path is its current cover;
 * - community: the project is in `team_projects_public` (active), is a
 *   community, and the path is its current cover;
 * - newsletter: an enabled block of the edition carries the path as its
 *   displayed image and either the edition is published (anonymous RLS), or
 *   it has been pushed to the mailing service and not withdrawn. The second
 *   case keeps images in already-distributed emails working until staff
 *   unpublish the edition.
 *
 * Visibility reads go through the anonymous client wherever RLS already
 * expresses "public"; only the send-config lookup and the signing need the
 * admin client.
 */
import { ARTICLE_IMAGE_BUCKET } from "./storage";
import { mediaOwnerOf, mediaPathOf } from "./media";

/** Signed URL handed out by the media route: 10 minutes. */
export const MEDIA_REDIRECT_TTL_SECONDS = 10 * 60;

function refersTo(value: unknown, path: string): boolean {
  return typeof value === "string" && mediaPathOf(value) === path;
}

export async function isMediaPublic(path: string): Promise<boolean> {
  const owner = mediaOwnerOf(path);
  if (!owner) return false;
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const anon = publicSupabaseClient();

  if (owner.kind === "article") {
    const { data } = await anon
      .from("articles")
      .select("featured_image_url")
      .eq("id", owner.id)
      .maybeSingle();
    return refersTo(data?.featured_image_url, path);
  }

  if (owner.kind === "community") {
    const { data } = await anon
      .from("team_projects_public")
      .select("is_community, cover_image_url")
      .eq("id", owner.id)
      .maybeSingle();
    return Boolean(data?.is_community) && refersTo(data?.cover_image_url, path);
  }

  // Newsletter: published editions are visible to the anonymous client.
  const { data: publicBlocks } = await anon
    .from("newsletter_blocks")
    .select("featured_image_url")
    .eq("newsletter_id", owner.id);
  if ((publicBlocks ?? []).some((b) => refersTo(b.featured_image_url, path))) return true;

  // Not on the public archive: allow only an edition already handed to the
  // mailing service and not withdrawn since.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: edition }, { data: pushed }, { data: blocks }] = await Promise.all([
    supabaseAdmin.from("newsletters").select("status").eq("id", owner.id).maybeSingle(),
    supabaseAdmin
      .from("newsletter_send_config")
      .select("id")
      .eq("newsletter_id", owner.id)
      .not("campaign_id", "is", null)
      .limit(1),
    supabaseAdmin
      .from("newsletter_blocks")
      .select("featured_image_url")
      .eq("newsletter_id", owner.id)
      .eq("enabled", true),
  ]);
  if (!edition || edition.status === "unpublished" || edition.status === "draft") return false;
  if (!pushed?.length) return false;
  return (blocks ?? []).some((b) => refersTo(b.featured_image_url, path));
}

/** Short-lived signed URL for a path that already passed `isMediaPublic`. */
export async function signMediaPath(path: string, ttlSeconds = MEDIA_REDIRECT_TTL_SECONDS) {
  const { signStoragePaths } = await import("./storage.server");
  const signed = await signStoragePaths(ARTICLE_IMAGE_BUCKET, [path], ttlSeconds);
  return signed.get(path) ?? null;
}
