/**
 * AI cover image for an Insights article.
 *
 * Server-only. Draws one illustration from the article's own title and excerpt
 * (or an explicit art-direction brief) through the Lovable AI gateway, stores
 * it in the private article-images bucket and returns the signed URL.
 *
 * Unlike the community variant this helper does NOT write the row: the article
 * editor autosaves its local state 800ms after every change, so a server-side
 * write would be overwritten by the next autosave. The caller patches editor
 * state with `image_source = 'ai'`, which is what makes the mandatory
 * "AI generated" disclosure appear in the editor and on the public article.
 */
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "./storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

/** Brand-safe art direction shared with the community and newsletter images. */
const STYLE =
  "Warm, natural editorial photography-like illustration in a calm Swiss style. " +
  "Deep blue, soft bone and a small amount of yellow. Real light, honest " +
  "expressions, unposed people, believable Swiss environment. Never surreal, " +
  "never glossy. No text, no letters, no logos, no watermarks.";

function messageFor(status: number, body: string): string {
  if (status === 402)
    return "AI credits are exhausted for this workspace. Add credits and try again.";
  if (status === 403) return "Image generation is blocked by workspace policy.";
  if (status === 429) return "The image service is rate limited right now. Try again in a moment.";
  if (status === 400) return `The image request was rejected: ${body.slice(0, 300)}`;
  return `Image generation failed (${status}).`;
}

export async function generateArticleImage(
  client: Client,
  articleId: string,
  brief: string | null,
): Promise<{ url: string; alt: string }> {
  const { data: article, error } = await client
    .from("articles")
    .select("id, title, excerpt")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw error;
  if (!article) throw new Error("This article no longer exists.");

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI service is not configured");

  const context = [
    article.title ? `Article headline: ${article.title}.` : null,
    brief?.trim() ? `Art direction: ${brief.trim()}` : null,
    !brief?.trim() && article.excerpt
      ? `Lead paragraph:\n${String(article.excerpt).slice(0, 900)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Create a cover image for an article published by The Switzerland Chapter of ICF, the professional body for coaching in Switzerland.\n\n${context}\n\n${STYLE}`;

  // No client-side deadline: generation routinely runs tens of seconds and an
  // aborted request still bills upstream.
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: "1536x1024",
      quality: "low",
      n: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(messageFor(response.status, body));
  }

  const payload = (await response.json()) as { data?: { b64_json?: string }[] };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image service returned no image.");

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${articleId}/${Date.now()}-ai.png`;
  const { error: uploadError } = await client.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await client.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
  if (signError || !signed) throw signError ?? new Error("Could not create an image link.");

  return {
    url: signed.signedUrl as string,
    alt: `AI generated illustration for the article “${article.title ?? ""}”`.trim(),
  };
}
