/**
 * Speaker reads.
 *
 * Photos live in the private article-images bucket, so every row leaves the
 * server with a freshly signed URL — the stored path is never public.
 *
 * A speaker may be linked to a member's directory profile. The link is only
 * exposed while that profile is still published (resolved through
 * `coach_directory_public`); the member's profile photo fills in when the
 * speaker record has no photo of its own.
 */
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "./storage";
import type { EventSpeaker } from "./event-speakers";

type Row = {
  id: string;
  name: string | null;
  bio: string | null;
  url: string | null;
  image_path: string | null;
  profile_id: string | null;
};

const COLUMNS = "id, name, bio, url, image_path, profile_id";

async function withImages(rows: Row[]): Promise<EventSpeaker[]> {
  const { signStoragePaths, signProfileImages } = await import("./storage.server");
  const { publicSupabaseClient } = await import("./supabase-public.server");

  const profileIds = rows.map((r) => r.profile_id).filter((p): p is string => Boolean(p));
  const profiles = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data } = await publicSupabaseClient()
      .from("coach_directory_public")
      .select("profile_id, profile_image_path")
      .in("profile_id", profileIds);
    for (const p of (data ?? []) as {
      profile_id: string;
      profile_image_path: string | null;
    }[]) {
      profiles.set(p.profile_id, p.profile_image_path);
    }
  }

  const signed = await signStoragePaths(
    ARTICLE_IMAGE_BUCKET,
    rows.map((r) => r.image_path).filter((p): p is string => Boolean(p)),
    ARTICLE_IMAGE_TTL_SECONDS,
  );
  const profileSigned = await signProfileImages(
    [...profiles.values()].filter((p): p is string => Boolean(p)),
  );

  return rows.map((r) => {
    const publicProfile = r.profile_id && profiles.has(r.profile_id) ? r.profile_id : null;
    const profileImage = publicProfile ? profiles.get(publicProfile) : null;
    const imageUrl = r.image_path
      ? (signed.get(r.image_path) ?? null)
      : profileImage
        ? (profileSigned.get(profileImage) ?? null)
        : null;
    return {
      id: r.id,
      name: r.name ?? "",
      bio: r.bio ?? null,
      url: r.url ?? null,
      imagePath: r.image_path ?? null,
      imageUrl,
      profileId: publicProfile,
    };
  });
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

  const { data } = await supabase.from("event_speakers").select(COLUMNS).in("id", ids);
  const speakers = await withImages((data ?? []) as Row[]);
  const byId = new Map(speakers.map((s) => [s.id, s]));
  // Preserve the stored order.
  return ids.map((id) => byId.get(id)).filter((s): s is EventSpeaker => Boolean(s));
}

/** Name search over the chapter-wide speaker library, capped, with usage counts. */
export async function searchSpeakers(
  term: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
): Promise<EventSpeaker[]> {
  // Saved library lists external speakers only; members come from member search.
  const cleaned = term.replace(/[%_,()]/g, "").trim();
  let rows: Row[];
  if (cleaned.length >= 2) {
    const { data, error } = await client
      .from("event_speakers")
      .select(COLUMNS)
      .is("profile_id", null)
      .ilike("name", `%${cleaned}%`)
      .order("name", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as Row[];
  } else {
    // No search term: the three most recently used external speakers.
    const { data: recent, error: recentError } = await client
      .from("event_speaker_links")
      .select("speaker_id, created_at, event_speakers!inner(profile_id)")
      .is("event_speakers.profile_id", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (recentError) throw new Error(recentError.message);
    const ids: string[] = [];
    for (const l of (recent ?? []) as { speaker_id: string }[]) {
      if (!ids.includes(l.speaker_id)) ids.push(l.speaker_id);
      if (ids.length === 3) break;
    }
    if (ids.length === 0) return [];
    const { data, error } = await client.from("event_speakers").select(COLUMNS).in("id", ids);
    if (error) throw new Error(error.message);
    const byId = new Map(((data ?? []) as Row[]).map((r) => [r.id, r]));
    rows = ids.map((id) => byId.get(id)).filter((r): r is Row => Boolean(r));
  }
  const speakers = await withImages(rows);
  if (rows.length === 0) return speakers;

  const { data: links } = await client
    .from("event_speaker_links")
    .select("speaker_id")
    .in(
      "speaker_id",
      rows.map((r) => r.id),
    );
  const counts = new Map<string, number>();
  for (const l of (links ?? []) as { speaker_id: string }[]) {
    counts.set(l.speaker_id, (counts.get(l.speaker_id) ?? 0) + 1);
  }
  return speakers.map((s) => ({ ...s, usageCount: counts.get(s.id) ?? 0 }));
}
