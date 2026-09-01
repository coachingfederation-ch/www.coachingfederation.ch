# Reusable language-toggle translation module

Replace the per-locale accordion lists in the CMS with the language-tab pattern
introduced in Member engagement: pick a language with a toggle row, edit the
fields for that language, translate all target languages in one click, save once.

## The module

New `src/components/cms/translations/LocaleTabsEditor.tsx`, plus a small
`useLocaleDraft` hook holding the buffered draft.

What it gives every caller:

- A language toggle row (EN · DE · FR · IT, EN first as the source).
- Per-language fields rendered from a field config already used today
  (`input`, `textarea`, `rich` markdown editor).
- One "Translate to DE, FR, IT" button that fills every target language from
  the English copy into the draft only — never straight into the database.
- Freshness badges per language (not translated / needs refresh / manually
  edited / up to date), shown on the toggle chips instead of in a list.
- A Save / Discard footer with an unsaved-changes guard, reusing the buffered
  save model already proven in the community panel.

Callers keep supplying the same adapter shape as today (`load`, `translate`,
`save`, `valuesFromRow`, `fields`, labels), so the switch is mostly a swap of
the presentation component. All labels stay in the existing CMS i18n files.

## Where it is applied

1. **Operational structure → Local communities → Description**
   (`CommunityPanel.tsx`): the three stacked locale cards become one toggle
   editor with the markdown description per language.
2. **Events → Event content** (`EventTranslationsPanel.tsx`): title, summary,
   description per language.
3. **Insights → Articles** (`TranslationsPanel.tsx`): same swap, keeping the
   markdown write/preview toggle on the body field.
4. **Newsletter** — new, see below.

The old `GenericTranslationsPanel` is removed once all four callers move over.

## Multilanguage newsletter

Today an edition is single-language and sends one campaign. The change:

- Every block gains translated `title` and `content` per language; the edition
  gains a translated title and mail subject.
- The block editor gets the same language toggle at the top of the editor: the
  editor works in the selected language, English stays the source, and one
  button translates the whole edition (all enabled blocks + subject) into DE,
  FR and IT for review before saving.
- Asset blocks (Insights, Events, Europe Pulse, bad joke …) are regenerated in
  English as today, then translated — regenerating a block marks its
  translations stale so the badge asks for a refresh.
- Preview and the public edition render in the chosen language.

**Per-language sending:** the send panel becomes one row per language, each
with its own MailerLite group, subject and push/send state, and a per-language
"Push" and "Send". Languages with no recipients or no translation are shown as
skipped, never sent half-translated. Sending stays behind the existing publish
roles and confirmation.

## Technical notes

- New tables `newsletter_translations` (edition title + subject per locale) and
  `newsletter_block_translations` (title, content, image alt per locale), both
  with `manually_edited` and `source_updated_at` to match the existing
  translation tables. Staff-only RLS mirroring `newsletter_blocks`, with
  explicit GRANTs.
- `newsletter_send_config` moves from one row per newsletter to one row per
  (newsletter, locale): add a `locale` column, backfill existing rows to the
  edition language, swap the unique index.
- New server functions `translateNewsletterFn` (bulk, English → DE/FR/IT via
  the Lovable AI gateway, same prompt style as the event and community
  translators) and locale-aware variants of the send-state, push and send
  functions.
- Existing per-entity translate server functions are reused unchanged; the
  bulk button calls them per locale where a bulk endpoint does not exist yet.

## PR note

**Summary** — Introduces one reusable language-toggle translation editor for the
CMS, applies it to communities, events and articles, and makes the newsletter
multilanguage including per-language delivery.

**Changes**
- UI: new `LocaleTabsEditor` + `useLocaleDraft`; community, event, article and
  newsletter editors switched over; `GenericTranslationsPanel` removed;
  newsletter send panel becomes per-language.
- Backend: `translateNewsletterFn`; locale-aware newsletter send functions;
  preview/render resolves a locale with English fallback.
- Schema: `newsletter_translations`, `newsletter_block_translations`,
  `newsletter_send_config.locale` + unique index change.

**Backend / schema changes** — Two new tables with RLS and GRANTs; one additive
column plus a unique-index swap on `newsletter_send_config` (existing rows
backfilled to the edition language).

**Testing & verification** — Editing and translating in all four surfaces as
admin and editor; saving after switching languages and entities (no clobbering);
newsletter preview per language; MailerLite push per language against a test
group before any real send.

**Risks & rollback** — Main risk is the send-config uniqueness change; it is
backfilled and backward compatible for one-language editions. UI swaps are
revertible per component. Migrations are safe to leave in place if the code is
reverted.

**Follow-ups** — Automatic re-translation when an asset block regenerates is
left manual (badge only); per-language open/click stats are not covered.
