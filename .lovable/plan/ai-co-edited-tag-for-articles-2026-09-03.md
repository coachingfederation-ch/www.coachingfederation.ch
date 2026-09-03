# "AI co-edited" tag for articles

Editors can mark an article as written with AI assistance. When the flag is on,
readers see a small, honest disclosure pill on the article — the same
transparency treatment the brand already uses for AI-generated imagery, applied
to the text.

## What the editor sees

In the article editor's publishing sidebar, directly under "Featured on
Insights":

```text
AI co-edited                                  [x]
Shown to readers as a small tag on the article.
```

A plain checkbox, saved with the article like the other metadata. No effect on
translations, scheduling or publishing.

## What the reader sees

- **Article page** — a small pill next to the date/reading-time byline line:
  "AI co-edited". Neutral wording, no icon beyond the existing badge dot.
- **Insights list** — the same tag on the article card, so the disclosure is not
  hidden behind a click.
- Localised in EN, DE, FR, IT.

The existing "AI generated" badge on cover images stays exactly as it is; this
is a separate signal about the text.

## Technical section

- **Schema** — migration adding `ai_coedited boolean not null default false` to
  `public.articles`. No new table, no new grants or policies needed (the column
  inherits the table's existing RLS and GRANTs). The column is added to the
  public article select list in `src/lib/articles.ts` and to the `ArticleRow` /
  `PublicArticle` types.
- **Editor** — one checkbox row in `src/components/cms/ArticleMetaSidebar.tsx`
  using the existing `update({ ai_coedited })` patch path, so it saves through
  the current autosave/save flow untouched.
- **Reader UI** — the design system's `AiBadge` with a `label` override, so the
  disclosure uses the library component rather than a new pill: rendered in
  `src/pages/InsightDetail.tsx` beside the byline metadata and in the insight
  card component used by `src/pages/Insights.tsx`.
- **i18n** — one new key per locale, `insights.aiCoedited`, plus the editor
  labels under the CMS namespace (`editor.aiCoedited`, `editor.aiCoeditedNote`).
- **Types** — regenerate the Supabase types after the migration.

## PR note

**Summary** — Adds an optional "AI co-edited" disclosure to articles: a
checkbox in the editor sidebar and a small badge on the public article page and
insight cards, in all four languages.

**Changes**
- Backend/schema: `articles.ai_coedited` boolean column (default false); no RLS
  or grant changes.
- CMS: checkbox in the publishing sidebar under "Featured on Insights".
- Public: `AiBadge` with an "AI co-edited" label on the article byline row and
  on insight cards; EN/DE/FR/IT copy.

**Testing & verification** — Toggle on a draft and on a published article,
confirm the badge appears/disappears publicly and survives reload; check the
insights list, all four locales, and that translations, scheduling and the
existing image AI badge are unaffected. Typecheck, build and Prettier clean.

**Risks & rollback** — Additive and defaulted off; removing the UI leaves an
unused column behind harmlessly.

**Follow-ups / known debt** — No per-section granularity (the flag covers the
whole article) and no automatic detection; it is an editor's declaration.
