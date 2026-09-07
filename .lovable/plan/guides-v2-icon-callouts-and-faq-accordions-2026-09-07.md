# Guides v2 — icon callouts and FAQ accordions

Extends the member guides so a section can carry several typed callouts (info, warning, critical), and a section can instead be a set of questions and answers shown as an accordion. Existing guides keep their content.

## What changes for editors

- Each section now has a **type**: *Article* (today's layout) or *FAQ*.
- Article sections get a **callout list** instead of the single callout box. Each callout has a type (info / warning / critical), an optional bold lead-in label, and text with the usual formatting toolbar. Add and delete as many as needed.
- FAQ sections get a **question list**: question, answer, and an optional short quotable line shown to readers under a "Say this" label.
- Ordering stays simple position-based (no drag and drop).

## What changes for readers

- Callouts show their own icon and colour — ℹ️ info, ⚠️ warning, ✖️ critical — independent of the section's tone strip.
- FAQ sections render as an accordion: click a question to open the answer; the quotable line appears inside.
- Everything else on `/guides` and `/guides/:slug` stays exactly as it is.

## Translations

DE, FR and IT cover the new fields: callout label and text, question, answer, quote. Same behaviour as today — one-click machine translation for the whole guide, missing values fall back to English, manual edits are kept and are not overwritten by re-translation, proper nouns stay untranslated.

## Access

Unchanged. Published guides are public, drafts are staff-only, only editor roles can write.

## Technical notes

Schema (one migration, with GRANTs, RLS and policies mirroring the existing guide tables):

- `guide_sections.kind text not null default 'article'` with a CHECK of `('article','faq')`.
- New `public.guide_section_callouts` (`section_id`, `position`, `kind` CHECK `('info','warning','critical')`, `label`, `body`) and `public.guide_callout_translations` (`callout_id`, `locale`, `label`, `body`, `manually_edited`, `source_updated_at`).
- New `public.guide_faq_items` (`section_id`, `position`, `question`, `answer`, `quote`) and `public.guide_faq_item_translations` (`item_id`, `locale`, `question`, `answer`, `quote`, `manually_edited`, `source_updated_at`).
- Data move inside the same migration: every non-empty `guide_sections.callout` becomes one callout row at position 0, its type derived from the section tone (`critical` → critical, `caution` → warning, otherwise info); the matching `guide_section_translations.callout` values become `guide_callout_translations` rows in all locales. Then drop `guide_sections.callout` and `guide_section_translations.callout`.

Code:

- `src/lib/guides.ts` — `GuideSection` gains `kind`, `callouts: GuideCallout[]`, `faq: GuideFaqItem[]`; the `callout` string and `TONE_CALLOUT` map are replaced by a `CALLOUT_KIND` style map (teal / warn / destructive tokens, lucide `Info`, `AlertTriangle`, `XCircle`).
- `src/lib/guides.server.ts` — nested selects for the two new child tables plus their translations, merged locale-first like today.
- `src/lib/guides-admin.functions.ts` — CRUD server fns for callouts and FAQ items (create / update / delete), editor-gated as the existing ones; `updateGuideSection` accepts `kind`.
- `src/lib/guide-translations.functions.ts` — field keys extend to `s<n>_c<m>_label`, `s<n>_c<m>_body`, `s<n>_q<m>_question`, `s<n>_q<m>_answer`, `s<n>_q<m>_quote`; load/save map them onto the two new translation tables; `translateGuide` sends and writes them back unchanged in structure.
- `src/routes/_staff/manage.guides.tsx` — section type switch, callout list editor and FAQ list editor, both save-on-blur like the existing fields; translation panel `deps` include the new child counts.
- `src/pages/GuideDetail.tsx` — typed callout rendering and the design-system `Accordion` for FAQ sections.
- New CMS i18n keys in `src/i18n/locales/{en,de,fr,it}/cms.json`; a `guides.faq.sayThis` label in the four `guides.json` files.

## PR note

**Summary** — Replaces the single per-section callout with an ordered list of typed, icon-bearing callouts and adds FAQ sections that render as accordions, in the CMS, on the public guide pages, and across all four languages.

**Changes** — UI: section type switch, callout and FAQ editors, typed callout and accordion rendering. Backend/schema: four new tables with RLS and GRANTs, `kind` on sections, data migration of existing callouts, drop of the two old columns. Translations: new field keys wired through load, save and machine translation.

**Backend / schema changes** — as listed above; the data move and column drops run in the same migration.

**Testing & verification** — Social Media Guidelines renders unchanged in EN/DE/FR/IT with its callout preserved; add two callouts of different types plus an FAQ section and check the public page; translate to DE, edit one field manually, re-translate and confirm the manual edit survives; confirm a draft guide 404s when signed out and a non-editor cannot write; build and typecheck clean with no references to the old callout field.

**Risks & rollback** — Medium: the migration drops two columns, so reverting the code alone would break reads. Rollback means reverting code *and* restoring the columns from the pre-migration state.

**Follow-ups / known debt** — No drag-and-drop reordering, no version history or PDF export, no per-row FAQ icons; the "Approaching Organizations" guide content is authored later in the CMS.
