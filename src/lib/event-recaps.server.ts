/**
 * Server-only logic for event recaps.
 *
 * Two very different reads live here and they are deliberately kept apart:
 *
 * - `loadPublicRecap` renders what anybody may see — the story and the
 *   web-sized gallery. It reads through RLS-protected tables whose policies
 *   already require a published recap on a published, non-internal event.
 * - `signRecapDownloads` hands out original photos and attachments. It signs
 *   with the admin client, so the entitlement decision must happen *before* it
 *   is called; `recapEntitlement` is that decision and nothing else calls into
 *   the signer.
 */
import {
  EVENT_MEDIA_BUCKET,
  EVENT_RECAP_DOWNLOAD_TTL_SECONDS,
  EVENT_RECAP_PHOTO_TTL_SECONDS,
} from "./storage";
import { signStoragePaths } from "./storage.server";
import type { PublicRecap, RecapAudience, RecapDownload } from "./event-recaps";

type RecapRow = {
  id: string;
  event_id: string;
  headline: string | null;
  body: string | null;
  language: string;
  status: string;
  published_at: string | null;
  downloads_audience: RecapAudience;
};

type PhotoRow = {
  id: string;
  sort_order: number;
  web_path: string;
  original_path: string | null;
  caption: string | null;
  alt: string | null;
  is_ai: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * The published recap for one event, or null. `supabase` is the caller's own
 * client (anonymous on the public site), so an unpublished recap simply comes
 * back empty instead of needing a second status check here.
 */
export async function loadPublicRecap(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  eventId: string,
  locale: string,
): Promise<PublicRecap | null> {
  const { data: row } = await supabase
    .from("event_recaps")
    .select(
      "id, event_id, headline, body, language, status, published_at, downloads_audience",
    )
    .eq("event_id", eventId)
    .eq("status", "published")
    .maybeSingle();
  const recap = (row as RecapRow | null) ?? null;
  if (!recap) return null;

  const [{ data: photoRows }, { data: fileRows }, { data: translation }] = await Promise.all([
    supabase
      .from("event_recap_photos")
      .select("id, sort_order, web_path, original_path, caption, alt, is_ai")
      .eq("recap_id", recap.id)
      .order("sort_order", { ascending: true }),
    // File metadata is not readable over the Data API by design; the listing is
    // harmless, the bytes are not, so it is read with the admin client and the
    // URL is withheld until `recapEntitlement` says otherwise.
    (await admin())
      .from("event_recap_files")
      .select("id, filename, label, size_bytes, content_type, sort_order")
      .eq("recap_id", recap.id)
      .order("sort_order", { ascending: true }),
    recap.language === locale
      ? Promise.resolve({ data: null })
      : supabase
          .from("event_recap_translations")
          .select("headline, body")
          .eq("recap_id", recap.id)
          .eq("locale", locale)
          .maybeSingle(),
  ]);

  const photos = (photoRows ?? []) as PhotoRow[];
  const signed = await signStoragePaths(
    EVENT_MEDIA_BUCKET,
    photos.map((p) => p.web_path),
    EVENT_RECAP_PHOTO_TTL_SECONDS,
  );

  const tr = (translation as { headline: string | null; body: string | null } | null) ?? null;

  return {
    id: recap.id,
    headline: tr?.headline || recap.headline,
    body: tr?.body || recap.body,
    published_at: recap.published_at,
    downloads_audience: recap.downloads_audience,
    resolvedLocale: tr ? locale : recap.language,
    photos: photos.map((p) => ({
      id: p.id,
      sort_order: p.sort_order,
      url: signed.get(p.web_path) ?? null,
      caption: p.caption,
      alt: p.alt,
      is_ai: p.is_ai,
    })),
    files: ((fileRows ?? []) as RecapDownloadRow[]).map((f) => ({
      id: f.id,
      filename: f.filename,
      label: f.label,
      size_bytes: f.size_bytes,
      content_type: f.content_type,
    })),
    hasOriginals: photos.some((p) => Boolean(p.original_path)),
  };
}

type RecapDownloadRow = {
  id: string;
  filename: string;
  label: string | null;
  size_bytes: number | null;
  content_type: string | null;
};

/**
 * Decides whether `userId` may pull the originals of a published recap.
 *
 * `public` needs nothing, `members` needs an active membership, `attendees`
 * needs a confirmed registration on that very event. Anything else is a no.
 */
export async function recapEntitlement(
  eventId: string,
  audience: RecapAudience,
  userId: string | null,
): Promise<boolean> {
  if (audience === "public") return true;
  if (!userId) return false;
  const db = await admin();

  if (audience === "members") {
    const { data } = await db
      .from("members")
      .select("id")
      .eq("auth_user_id", userId)
      .eq("activity_state", "active")
      .maybeSingle();
    if (data) return true;
    // A member who attended is entitled either way; fall through.
  }

  const { data: registration } = await db
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .maybeSingle();
  return Boolean(registration);
}

/**
 * Short-lived links for every original photo and attachment of a recap.
 * Callers must have passed `recapEntitlement` first.
 */
export async function signRecapDownloads(recapId: string): Promise<RecapDownload[]> {
  const db = await admin();
  const [{ data: photos }, { data: files }] = await Promise.all([
    db
      .from("event_recap_photos")
      .select("id, original_path, web_path, sort_order")
      .eq("recap_id", recapId)
      .order("sort_order", { ascending: true }),
    db
      .from("event_recap_files")
      .select("id, path, filename, sort_order")
      .eq("recap_id", recapId)
      .order("sort_order", { ascending: true }),
  ]);

  const photoRows = ((photos ?? []) as { id: string; original_path: string | null }[]).filter(
    (p) => p.original_path,
  );
  const fileRows = (files ?? []) as { id: string; path: string; filename: string }[];

  const signed = await signStoragePaths(
    EVENT_MEDIA_BUCKET,
    [...photoRows.map((p) => p.original_path!), ...fileRows.map((f) => f.path)],
    EVENT_RECAP_DOWNLOAD_TTL_SECONDS,
  );

  const out: RecapDownload[] = [];
  photoRows.forEach((p, index) => {
    const url = signed.get(p.original_path!);
    if (!url) return;
    const extension = p.original_path!.split(".").pop()?.slice(0, 5) ?? "jpg";
    out.push({
      id: p.id,
      kind: "photo",
      filename: `photo-${String(index + 1).padStart(2, "0")}.${extension}`,
      url,
    });
  });
  for (const f of fileRows) {
    const url = signed.get(f.path);
    if (url) out.push({ id: f.id, kind: "file", filename: f.filename, url });
  }
  return out;
}
