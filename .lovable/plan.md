# Newsletter blocks: images and an AI joke illustration

Two additions to the newsletter editor.

## 1. Every block can carry an image

Each block gets the same image workflow the Insights article editor already has:

- Pick from Unsplash (existing picker, with photographer credit stored and shown).
- Upload a file from the computer.
- Paste an image URL.
- Remove the current image.

The block card in `/manage/newsletters/:id` shows a compact image slot under the block title. The chosen image renders above the block text in the email preview (that already works — nothing sets the value today) and on the public archive page, with the Unsplash credit line underneath.

## 2. Bad joke of the month gets an AI illustration

The "Bad joke" block gets a "Generate image" action next to the regenerate button. It sends the current joke text to the image model, saves the result as the block image, and marks it as AI generated.

- The illustration is created from the joke itself, so it always matches the current joke.
- Regenerating the joke does not silently replace the picture — the editor presses the button again.
- Every AI image is labelled "AI generated" in the editor, in the email, and on the public page, per the brand rules. The label cannot be removed.
- The action is available on any block, not only the joke, but the joke block is where it is surfaced prominently.

## Technical notes

**Database** — one migration adding to `public.newsletter_blocks`:
`image_alt text`, `image_source text` (`unsplash` | `upload` | `url` | `ai`), `image_credit_name text`, `image_credit_url text`. No grant or RLS changes: the table's existing policies already cover these columns.

**Server**
- `saveNewsletterBlockFn` (`src/lib/newsletters.functions.ts`) accepts the new fields with the existing Zod validation style.
- New `generateBlockImageFn` (thin wrapper in `src/lib/newsletters.functions.ts`, logic in a new `src/lib/newsletter-images.server.ts`): staff-role checked, reads the block, builds a prompt from the block text, POSTs to `https://ai.gateway.lovable.dev/v1/images/generations` with `model: openai/gpt-image-2`, `quality: "low"`, non-streaming (a server-side job with no client preview), uploads the PNG to the existing private `article-images` bucket, signs it with `ARTICLE_IMAGE_TTL_SECONDS`, and writes `featured_image_url` + `image_source: "ai"`. Gateway 402/403/429 statuses are surfaced verbatim to the editor, no auto-retry. No client-side timeout on the fetch.
- `getNewsletterFn` / `renderNewsletterEmail` (`src/lib/newsletters.server.ts`) pass the new columns through.

**UI**
- New `src/components/cms/BlockImageField.tsx` reusing `UnsplashPicker`, the upload helper pattern from `src/routes/_staff/articles.$id.tsx`, and design-system `Button`/`Input`. Used by every block card.
- `src/lib/email-templates/newsletter-edition.tsx`: add `alt`, the credit line, and an "AI generated" caption under the image.
- `src/pages/NewsletterEdition.tsx`: select and render the image, using the design system's `AiPhoto` / `AiBadge` for AI images.

## PR note

**Summary** — Newsletter blocks can carry an image (Unsplash, upload, or URL), and the bad-joke block can generate an AI illustration from its own text, disclosed as AI generated everywhere it appears.

**Changes**
- UI: block image field in the newsletter editor; image + credit + AI badge in the email template and public edition page.
- Backend: new server function for AI image generation via the Lovable AI gateway; block save accepts image metadata.
- Schema: four nullable columns on `newsletter_blocks`.

**Backend / schema changes** — one additive migration (nullable columns only). No RLS or grant changes.

**Testing & verification** — pick an Unsplash image, upload a file, paste a URL, remove an image; generate a joke illustration and confirm it appears in preview and on the published page with the AI label; check an editor without publish rights is unaffected; confirm gateway credit/rate-limit errors show a readable message.

**Risks & rollback** — Blast radius limited to the newsletter feature. Reverting the code is safe with the columns left in place. AI image generation spends AI credits per click.

**Follow-ups / known debt** — Image URLs remain long-lived signed URLs from the private bucket (same known debt as article images). Image generation is non-streaming, so the button shows a spinner for the full generation time.
