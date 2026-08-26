/**
 * Server-only logic for sharing an event recap on the chapter's LinkedIn page
 * as a carousel (LinkedIn's multi-image post).
 *
 * Deliberately a sibling of `linkedin.server.ts` rather than an extension of
 * it: an article posts one branded card, a recap posts up to nine gallery
 * photos, and folding both into one function would make the article path
 * harder to read than keeping the gateway plumbing duplicated once here.
 * Gallery bytes are read from private storage with the admin client, after the
 * caller has already been cleared as a publisher.
 */
import { EVENT_MEDIA_BUCKET } from "./storage";
import { linkedInPostUrl } from "./linkedin";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";
const LINKEDIN_VERSION = "202506";

/** LinkedIn refuses a multi-image post above this count. */
const MAX_CAROUSEL_IMAGES = 9;

export type RecapLinkedInPost = {
  id: string;
  status: "pending" | "posted" | "failed";
  commentary: string;
  image_count: number;
  linkedin_post_urn: string | null;
  linkedin_post_url: string | null;
  posted_at: string | null;
  error_message: string | null;
  created_at: string;
};

const POST_COLUMNS =
  "id, status, commentary, image_count, linkedin_post_urn, linkedin_post_url, posted_at, error_message, created_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function gatewayAuth(): { lovableKey: string; connectionKey: string } | null {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["LINKEDIN_API_KEY"];
  if (!lovableKey || !connectionKey) return null;
  return { lovableKey, connectionKey };
}

function headers(auth: { lovableKey: string; connectionKey: string }, json = true) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${auth.lovableKey}`,
    "X-Connection-Api-Key": auth.connectionKey,
    "LinkedIn-Version": LINKEDIN_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

/** LinkedIn error bodies carry the real reason; never swallow them. */
async function failOn(response: Response, step: string): Promise<never> {
  const body = await response.text();
  console.error(`LinkedIn ${step} failed [${response.status}]: ${body}`);
  throw new Error(`LinkedIn ${step} failed (${response.status}): ${body.slice(0, 400)}`);
}

/** Newest posting attempt for a recap, or null when it was never shared. */
export async function latestRecapLinkedInPost(recapId: string): Promise<RecapLinkedInPost | null> {
  const db = await admin();
  const { data } = await db
    .from("event_recap_linkedin_posts")
    .select(POST_COLUMNS)
    .eq("recap_id", recapId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RecapLinkedInPost | null) ?? null;
}

/** Uploads one image and returns its LinkedIn URN. */
async function uploadImage(
  auth: { lovableKey: string; connectionKey: string },
  organizationUrn: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const init = await fetch(`${GATEWAY_URL}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: headers(auth),
    body: JSON.stringify({ initializeUploadRequest: { owner: organizationUrn } }),
  });
  if (!init.ok) await failOn(init, "image upload initialisation");
  const body = (await init.json()) as { value?: { uploadUrl?: string; image?: string } };
  const uploadUrl = body.value?.uploadUrl;
  const imageUrn = body.value?.image;
  if (!uploadUrl || !imageUrn) throw new Error("LinkedIn did not return an upload target");

  const target = new URL(uploadUrl);
  const upload = await fetch(`${GATEWAY_URL}${target.pathname}${target.search}`, {
    method: "PUT",
    headers: { ...headers(auth, false), "Content-Type": contentType },
    body: bytes,
  });
  if (!upload.ok) await failOn(upload, "image upload");
  return imageUrn;
}

type GalleryImage = { bytes: ArrayBuffer; contentType: string; altText: string };

/** Decodes the browser-rendered cover slide (a `data:` URL) into bytes. */
function decodeDataUrl(dataUrl: string): GalleryImage {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("The cover slide could not be read.");
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return {
    bytes: bytes.buffer,
    contentType: match[1]!,
    altText: "The Switzerland Chapter of ICF — event recap",
  };
}

/**
 * Reads the web renditions straight out of private storage. When the editor
 * hands over an explicit slide order, that order — and that selection — wins;
 * without one the gallery's own sort order is used.
 */
async function galleryImages(recapId: string, slideIds?: string[]): Promise<GalleryImage[]> {
  const db = await admin();
  const { data } = await db
    .from("event_recap_photos")
    .select("id, web_path, alt, caption, sort_order")
    .eq("recap_id", recapId)
    .order("sort_order", { ascending: true });

  let rows = (data ?? []) as {
    id: string;
    web_path: string;
    alt: string | null;
    caption: string | null;
  }[];
  if (slideIds?.length) {
    const byId = new Map(rows.map((row) => [row.id, row]));
    rows = slideIds.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
  }
  rows = rows.slice(0, MAX_CAROUSEL_IMAGES);
  const out: GalleryImage[] = [];
  for (const row of rows) {
    const { data: blob, error } = await db.storage.from(EVENT_MEDIA_BUCKET).download(row.web_path);
    if (error || !blob) continue;
    out.push({
      bytes: await blob.arrayBuffer(),
      contentType: blob.type || "image/jpeg",
      altText: (row.alt || row.caption || "Event photo").slice(0, 300),
    });
  }
  return out;
}

/**
 * Posts the recap gallery as one carousel and records the attempt. A failure
 * is stored as a `failed` row and re-thrown, so the publisher sees LinkedIn's
 * own reason instead of a generic error.
 */
export async function postRecapCarousel(input: {
  recapId: string;
  commentary: string;
  userId: string;
  /** Explicit slide order picked in the post editor. */
  slideIds?: string[];
  /** Branded cover slide rasterised in the browser, posted as slide one. */
  coverDataUrl?: string | null;
}): Promise<RecapLinkedInPost> {
  const db = await admin();
  const auth = gatewayAuth();
  if (!auth) throw new Error("LinkedIn is not connected yet — link the LinkedIn connector first.");

  const { data: config } = await db
    .from("linkedin_config")
    .select("organization_urn")
    .maybeSingle();
  const organizationUrn = (config?.organization_urn as string | null) ?? null;
  if (!organizationUrn)
    throw new Error("No LinkedIn company page is configured for the chapter yet.");

  const gallery = await galleryImages(input.recapId, input.slideIds);
  const cover = input.coverDataUrl ? [decodeDataUrl(input.coverDataUrl)] : [];
  const images = [...cover, ...gallery].slice(0, MAX_CAROUSEL_IMAGES);
  if (images.length === 0)
    throw new Error("Add at least one gallery photo before sharing the recap on LinkedIn.");

  const { data: row, error: insertError } = await db
    .from("event_recap_linkedin_posts")
    .insert({
      recap_id: input.recapId,
      status: "pending",
      commentary: input.commentary,
      image_count: images.length,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  try {
    const uploaded: { id: string; altText: string }[] = [];
    for (const image of images) {
      uploaded.push({
        id: await uploadImage(auth, organizationUrn, image.bytes, image.contentType),
        altText: image.altText,
      });
    }

    // One photo is an ordinary image post; several become a carousel.
    const content =
      uploaded.length === 1
        ? { media: { id: uploaded[0]!.id, altText: uploaded[0]!.altText } }
        : { multiImage: { images: uploaded } };

    const post = await fetch(`${GATEWAY_URL}/rest/posts`, {
      method: "POST",
      headers: headers(auth),
      body: JSON.stringify({
        author: organizationUrn,
        commentary: input.commentary,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content,
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!post.ok) await failOn(post, "post creation");

    const urn =
      post.headers.get("x-restli-id") ??
      post.headers.get("x-linkedin-id") ??
      ((await post.json().catch(() => ({}))) as { id?: string }).id;
    if (!urn) throw new Error("LinkedIn accepted the post but returned no id");

    const { data: updated, error } = await db
      .from("event_recap_linkedin_posts")
      .update({
        status: "posted",
        linkedin_post_urn: urn,
        linkedin_post_url: linkedInPostUrl(urn),
        posted_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select(POST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return updated as RecapLinkedInPost;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown LinkedIn error";
    await db
      .from("event_recap_linkedin_posts")
      .update({ status: "failed", error_message: message.slice(0, 2000) })
      .eq("id", row.id);
    throw new Error(message);
  }
}

/** Tones the post editor offers; the prompt is the only place they differ. */
const TONE_HINTS: Record<string, string> = {
  warm: "Warm and human. Thank the people who came, name what the room felt like.",
  professional: "Professional and factual. Lead with what was covered and what people took away.",
  celebratory: "Celebratory and energetic, still grounded — no hype, no invented claims.",
};

/**
 * Drafts the LinkedIn commentary for a recap. Falls back to the recap's own
 * headline plus the public link when the AI gateway is unavailable, so the
 * editor always opens with usable text.
 */
export async function draftRecapCommentary(input: {
  headline: string;
  body: string;
  eventTitle: string;
  recapUrl: string;
  tone: string;
}): Promise<string> {
  const fallback = [input.headline || input.eventTitle, "", input.recapUrl]
    .join("\n")
    .slice(0, 3000);
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallback;

  const prompt = [
    "Write ONE LinkedIn post for The Switzerland Chapter of ICF about an event that has just taken place.",
    TONE_HINTS[input.tone] ?? TONE_HINTS["warm"],
    "One short hook line, then two or three short lines of substance, then an invitation to read the recap, then the link on its own line.",
    "At most 1200 characters. At most one emoji. At most three hashtags on the final line.",
    "American English, active voice, Oxford comma. No invented statistics, quotes or claims.",
    "Reply with the post text only — no quotes, no markdown, no labels.",
    "",
    `EVENT: ${input.eventTitle}`,
    `RECAP HEADLINE: ${input.headline}`,
    `RECAP STORY: ${input.body.slice(0, 4000)}`,
    `LINK: ${input.recapUrl}`,
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 3000) : fallback;
  } catch {
    return fallback;
  }
}
