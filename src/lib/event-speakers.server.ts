/**
 * Speaker reads.
 *
 * Photos live in the private article-images bucket, so every row leaves the
 * server with a freshly signed URL — the stored path is never public.
 */
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "./storage";
import type { EventSpeaker } from "./event-speakers";

type Row = {
  id: string;
  name: string | null;
  bio: string | null;
  url: string | null;
  image_path: string | null;
};

async function withImages(rows: Row[]): Promise<EventSpeaker[]> {
  const { signStoragePaths } = await import("./storage.server");
  const signed = await signStoragePaths(
    ARTICLE_IMAGE_BUCKET,
    rows.map((r) => r.image_path).filter((p): p is string => Boolean(p)),
    ARTICLE_IMAGE_TTL_SECONDS,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? "",
    bio: r.bio ?? null,
    url: r.url ?? null,
    imagePath: r.image_path ?? null,
    imageUrl: r.image_path ? (signed.get(r.image_path) ?? null) : null,
  }));
}

/**
 * `client` overrides the anon reader: the public link policy only exposes
 * published events, so the CMS has to read a draft's speakers through the
 * caller's own RLS-scoped client.
 */
export async function loadEventSpeakers(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any,
): Promise<EventSpeaker[]> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const supabase = client ?? publicSupabaseClient();

  const { data: links, error } = await supabase
    .from("event_speaker_links")
    .select("speaker_id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const ids = ((links ?? []) as { speaker_id: string }[]).map((l) => l.speaker_id);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("event_speakers")
    .select("id, name, bio, url, image_path")
    .in("id", ids);
  const speakers = await withImages((data ?? []) as Row[]);
  const byId = new Map(speakers.map((s) => [s.id, s]));
  // Preserve the stored order.
  return ids.map((id) => byId.get(id)).filter((s): s is EventSpeaker => Boolean(s));
}

/** Name search over the chapter-wide speaker library, capped. */
export async function searchSpeakers(
  term: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<EventSpeaker[]> {
  const cleaned = term.replace(/[%_,()]/g, "").trim();
  let query = client.from("event_speakers").select("id, name, bio, url, image_path");
  if (cleaned.length >= 2) query = query.ilike("name", `%${cleaned}%`);
  const { data, error } = await query.order("name", { ascending: true }).limit(20);
  if (error) throw new Error(error.message);
  return withImages((data ?? []) as Row[]);
}
