# AI image generation for the article cover image

Give the article editor's featured-image block the same "Generate with AI"
option the community editor just got: a short optional art-direction field plus
a generate button, the result stored in the private article-images bucket, and
the mandatory "AI generated" badge shown wherever the cover appears.

## What the editor gets

In the featured-image block of the article editor (next to Upload / paste URL /
Unsplash):

- An optional one-line art-direction field ("coaches talking in a Basel café").
  Left empty, the image is drawn from the article's own title and excerpt.
- A "Generate with AI" button with a spinner while the image renders.
- The finished image replaces the cover, `image_source` is set to `ai`, any
  Unsplash credit is cleared, and an alt text is filled in automatically.
- An "AI generated" badge overlays the cover preview in the editor, and gateway
  errors (no credits, moderation rejection, rate limit) appear as plain text in
  the editor rather than failing silently.

## Public disclosure

Wherever an article cover with `image_source = 'ai'` is rendered — the article
detail hero, the insights list cards, and the featured article block — the
non-removable `AiBadge` is shown over the image. This is a brand requirement,
not an option.

## Technical notes

- New server-only helper `src/lib/article-images.server.ts`, modelled on
  `src/lib/community-images.server.ts`: reads title/excerpt from `articles`,
  calls the Lovable AI gateway `/v1/images/generations` with
  `openai/gpt-image-2` (`size: 1536x1024`, `quality: low`, non-streaming),
  uploads the PNG to `ARTICLE_IMAGE_BUCKET` under
  `articles/<id>-<timestamp>.png`, signs it with `ARTICLE_IMAGE_TTL_SECONDS`,
  and writes `featured_image_url`, `image_alt`-equivalent, `image_source = 'ai'`
  and null credits back onto the row. Shares the brand art-direction prompt
  (deep blue / bone / yellow, natural, no text or logos).
- New `src/lib/article-images.functions.ts` exposing
  `generateArticleImageFn` — `createServerFn` with `requireSupabaseAuth`, gated
  on the same permission that already lets the caller edit that article, so RLS
  on `articles` stays the boundary. Input: `{ articleId, brief? }`.
- `src/components/cms/ArticleEditorPane.tsx`: add the brief input, the generate
  button, and the `AiBadge` overlay on the existing preview. No change to the
  existing upload / URL / Unsplash paths.
- Public rendering: add the `AiBadge` to the article hero and card image where
  `image_source === 'ai'`; this requires exposing `image_source` in the public
  article payload if it is not already selected there.
- No schema change: `articles` already carries `featured_image_url`,
  `image_source`, `image_credit_name` and `image_credit_url`.
- i18n: new keys under `editor.*` in `cms.json` for the four locales (generate
  button, brief placeholder, AI note, error prefix).

## PR note

- **Summary** — Adds AI image generation to the article cover-image block,
  reusing the community feature-image pipeline, with the mandatory AI
  disclosure in the editor and on the public site.
- **Changes** — CMS: brief field, generate button, AI badge in
  `ArticleEditorPane`. Backend: `article-images.server.ts` +
  `article-images.functions.ts`. Public: AI badge on article hero and cards.
  i18n: four locales.
- **Backend / schema changes** — None. Storage writes go to the existing
  private `article-images` bucket.
- **Testing & verification** — Generate an image as an editor and as an admin,
  verify the badge in the editor and on the published article, verify upload /
  URL / Unsplash still work, and confirm a 402/400 from the gateway surfaces as
  a readable message.
- **Risks & rollback** — Paid AI call per click; blast radius limited to the
  cover-image block. Revert is code-only, no migration.
- **Follow-ups / known debt** — Signed cover URLs still use the 10-year TTL
  workaround documented in `docs/tech-debt.md`; unchanged by this work.
