/**
 * AI illustration for a newsletter block.
 *
 * Server-only. Generates one image from the block's own text through the
 * Lovable AI gateway, stores it in the private article-images bucket and
 * returns a signed URL. Non-streaming on purpose: nothing renders progressive
 * previews here, the caller just waits for the finished PNG.
 *
 * Every image produced here is written back with `image_source = 'ai'`, which
 * is what makes the mandatory "AI generated" disclosure appear in the editor,
 * the email and the public archive.
 */
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "./storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

/** Brand-safe art direction shared by every generated block illustration. */
const STYLE =
  "Warm, natural editorial illustration in a calm Swiss style. Deep blue, " +
  "soft bone and a small amount of yellow. Friendly, human, gently humorous, " +
  "never surreal or glossy. No text, no letters, no logos, no watermarks.";

function messageFor(status: number, body: string): string {
  if (status === 402)
    return "AI credits are exhausted for this workspace. Add credits and try again.";
  if (status === 403) return "Image generation is blocked by workspace policy.";
  if (status === 429) return "The image service is rate limited right now. Try again in a moment.";
  if (status === 400) {
    // Moderation rejections are terminal — the editor has to change the text.
    return `The image request was rejected: ${body.slice(0, 300)}`;
  }
  return `Image generation failed (${status}).`;
}

export async function generateBlockImage(client: Client, blockId: string) {
  const { data: block, error } = await client
    .from("newsletter_blocks")
    .select("id, newsletter_id, block_type, title, content")
    .eq("id", blockId)
    .maybeSingle();
  if (error) throw error;
  if (!block) throw new Error("This block no longer exists.");

  const text = String(block.content ?? "").trim();
  if (!text)
    throw new Error("Write or generate the block text first — the image is drawn from it.");

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI service is not configured");

  const prompt =
    block.block_type === "bad_joke"
      ? `Illustrate this gentle coaching joke as a single scene. Joke:\n\n${text.slice(0, 1200)}\n\n${STYLE}`
      : `Illustrate the following newsletter section titled "${block.title}". Text:\n\n${text.slice(0, 1200)}\n\n${STYLE}`;

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
  const path = `newsletters/${block.newsletter_id}/${blockId}-${Date.now()}.png`;
  const { error: uploadError } = await client.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await client.storage
    .from(ARTICLE_IMAGE_BUCKET)
    .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
  if (signError || !signed) throw signError ?? new Error("Could not create an image link.");

  const url = signed.signedUrl as string;
  const { error: saveError } = await client
    .from("newsletter_blocks")
    .update({
      featured_image_url: url,
      // The generated file is also the framing source, so the editor can crop
      // and mark it afterwards without regenerating.
      image_original_url: url,
      image_source: "ai",
      image_credit_name: null,
      image_credit_url: null,
      image_alt: `AI generated illustration for “${block.title}”`,
    })
    .eq("id", blockId);
  if (saveError) throw saveError;

  return { url };
}
