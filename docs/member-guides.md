# Member guides

Guides are chapter guidance documents — the Social Media Guidelines are the
first one — published as ordinary pages of the site rather than as PDFs, so
they are readable on a phone, translatable, and editable without a new release.

- Public index: `/guides` (plus the `$locale/` mirrors).
- Public detail: `/guides/:slug`.
- Staff editor: `/manage/guides`, listed in the CMS menu as **Guides**
  (`src/components/cms/Shell.tsx`, `allowedRoles: ["editor"]`).
- The Member Area shell links to `/guides` from its top navigation
  (`src/components/member/MemberShell.tsx`).

## Structure

A guide has a slug, title, summary, eyebrow, intro, version label, optional
contact email, and a footnote — plus an ordered list of sections.

Every section has a **kind** and a **tone**:

| Concept | Values                                       | Effect                                                             |
| ------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `kind`  | `article`, `faq`                             | Article renders heading + lead + body; FAQ renders an accordion.   |
| `tone`  | `neutral`, `positive`, `caution`, `critical` | Surface treatment of the section card (`TONE_CARD` / `TONE_TEXT`). |

An **article** section carries an ordered list of callouts. A callout has its
own `kind` — `info`, `warning`, `critical` — an optional bold label, and body
text. The callout type owns its icon and colour (`CALLOUT_KIND` in
`src/lib/guides.ts`) independently of the section tone, so a neutral section can
still carry a "not allowed" callout.

An **FAQ** section carries an ordered list of items: question, answer, and an
optional short quotable line shown to readers under a "Say this" label. Readers
open one question at a time in the design-system `Accordion`.

Ordering is position-based in both lists; there is no drag and drop.

## Data model

| Table                         | Holds                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `guides`                      | Slug, English source copy, `is_published`, `published_at`, `sort_order`.          |
| `guide_sections`              | `position`, `kind` (CHECK `article`/`faq`), `tone`, eyebrow, heading, lead, body. |
| `guide_section_callouts`      | `position`, `kind` (CHECK `info`/`warning`/`critical`), label, body.              |
| `guide_faq_items`             | `position`, question, answer, quote.                                              |
| `guide_translations`          | One row per (guide, locale).                                                      |
| `guide_section_translations`  | One row per (section, locale).                                                    |
| `guide_callout_translations`  | One row per (callout, locale).                                                    |
| `guide_faq_item_translations` | One row per (FAQ item, locale).                                                   |

Every translation table is restricted to `de`, `fr`, `it` by CHECK — English is
the source and lives on the base row, never as a translation. Each translation
row carries `manually_edited` and `source_updated_at`, the same two columns the
article and member-profile translations use.

Children cascade on delete from their parent, so removing a section takes its
callouts, FAQ items and all their translations with it.

## Access

Grants and RLS are set per table in the two guide migrations:

- `anon` and `authenticated` may `SELECT`; only editors may write.
- Public read policies are scoped to published guides — a draft guide, and the
  sections, callouts, FAQ items and translations underneath it, are invisible
  to visitors. `/guides/:slug` therefore 404s for an unpublished slug.
- Write policies are `private.is_editor(auth.uid())` for all eight tables, and
  every admin server function calls `assertEditor(context)` before touching a
  row (`src/lib/guides-admin.functions.ts`). Two layers, same rule.

## Translation

`src/lib/guide-translations.functions.ts` flattens the whole guide into one
field map so a single AI call translates it in one pass. Keys are:

```text
title, summary, eyebrow, intro, footnote      guide level
s<n>_eyebrow | _heading | _lead | _body       section n
s<n>_c<m>_label | _body                       callout m of section n
s<n>_q<m>_question | _answer | _quote         FAQ item m of section n
```

`loadGuideTranslations` reads the four translation tables and merges them back
onto that key shape; `saveGuideTranslation` upserts them apart again, marking
every saved row `manually_edited`. Behaviour matches the rest of the CMS:
one-click translation for the whole guide, missing values fall back to English
field by field, and a manual edit is never silently overwritten by a
re-translation.

## Where things live

| Concern                         | File                                                     |
| ------------------------------- | -------------------------------------------------------- |
| Shared types, tone/callout maps | `src/lib/guides.ts`                                      |
| Public reads, locale merge      | `src/lib/guides.server.ts`, `guides.functions.ts`        |
| Editor CRUD (editor-gated)      | `src/lib/guides-admin.functions.ts`                      |
| Translation load/save/AI        | `src/lib/guide-translations.functions.ts`                |
| Staff editor screen             | `src/routes/_staff/manage.guides.tsx`                    |
| Public pages                    | `src/pages/GuidesIndex.tsx`, `src/pages/GuideDetail.tsx` |
| Copy keys                       | `src/i18n/locales/<lang>/guides.json`, `cms.json`        |
