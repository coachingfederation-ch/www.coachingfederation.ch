# Community editor: Markdown editor with AI, plus a feature image

Two improvements to the community content panel in the operational structure CMS.

## 1. Description becomes the full Markdown editor

The community description (source and the German / French / Italian translation
fields) switches from the small rich-text box to the same editor used for
articles and event descriptions: formatting toolbar, AI writing assistant, and a
Write / Preview toggle. Existing descriptions keep working — they are already the
same Markdown subset, so nothing needs converting.

The public community page already renders the description as Markdown, so richer
content (links, quotes, tables) displays correctly.

## 2. Feature image for a community

A new "Feature image" block in the community panel, working exactly like the
article cover image:

- Upload from the computer, pick from Unsplash, or paste an image URL.
- Preview with a Remove button.
- Unsplash picks store the photographer credit and link, shown on the public page
  as the site does elsewhere.
- Optional alt text field for accessibility.

Where it appears publicly:

- Community card on `/communities` — image at the top of the card, replacing the
  current member-avatar row only when an image is set (cards without an image
  stay exactly as they are today).
- Community detail page — image above the description as a rounded "window".

## Technical notes

- Migration adds to `public.op_projects`: `cover_image_url`, `cover_image_alt`,
  `image_source`, `image_credit_name`, `image_credit_url` (all nullable text), and
  extends the existing column-scoped `GRANT SELECT` for `anon` and `authenticated`
  to include them. No RLS change — the "admins manage op_projects" policy still
  governs writes.
- `src/components/cms/CommunityPanel.tsx`: replace `RichTextEditor` with
  `MarkdownEditor` (`modes={["write","preview"]}`) for the source and per-locale
  description fields, saving on blur as today; add the feature-image block reusing
  `UnsplashPicker`, the `ARTICLE_IMAGE_BUCKET` upload path and
  `trackUnsplashDownload`, following `ArticleEditorPane`'s pattern.
- `src/lib/communities.ts` / `communities.server.ts`: carry the new fields into
  `CommunitySummary` and `CommunityDetail`.
- `src/components/communities/CommunityCard.tsx` and `src/pages/CommunityDetail.tsx`:
  render image plus credit line when present.
- New `ops.community.image*` strings in `cms.json` for EN, DE, FR, IT; public
  credit label reuses the existing article credit string.

## PR note

- **Summary** — Upgrades the community description to the article Markdown editor
  with AI assist, and adds an optional feature image (upload / Unsplash / URL)
  surfaced on the public community card and detail page.
- **Changes** — UI: community CMS panel, community card, community detail page,
  i18n strings. Data: five nullable columns on `op_projects` with matching column
  grants.
- **Backend / Schema Changes** — One migration adding the columns and extending the
  column-scoped select grants. No RLS or policy changes.
- **Testing & Verification** — Edit a community description with the toolbar and AI
  assist, confirm round-trip after reload and that the public page matches the
  preview; upload an image, pick one from Unsplash, paste a URL, remove it; check
  `/communities` and the detail page with and without an image; run a translation
  and edit the translated description.
- **Risks & Rollback** — Low. Columns are additive and nullable; reverting the code
  leaves them unused. Existing descriptions are unaffected.
- **Follow-ups / Known Debt** — No cropping or mark placement for the community
  image (the newsletter frame editor is not wired up here); no AI image generation.
