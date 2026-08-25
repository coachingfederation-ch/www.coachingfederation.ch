# Auto-translate Categories and Vocabularies labels

Today the operational structure auto-translates new labels into DE, FR and IT, but the two taxonomy screens do not: adding an Insights category or a Coach Finder term stores only the English name and leaves the three language fields empty.

## What changes

- Adding a category on **Articles → Categories** auto-fills its German, French and Italian names.
- Adding a term on any **Vocabularies** tab (regions, specialisations, credentials, formats, languages, availability, client types, experience bands, event categories) does the same.
- Each existing row gets a small "Translate" action that fills only the language fields that are still empty, so manual wording is never overwritten.
- All translated values stay fully editable in the existing DE/FR/IT inputs.
- If the AI call fails or is slow, the row is still created with its English name and an inline notice explains that translations were not filled — creation never blocks.

## Technical notes

- Extract the existing prompt/parse logic from `src/lib/ops-label-translations.functions.ts` into a shared server helper `src/lib/label-translations.server.ts` (one batched `google/gemini-3-flash-preview` call, JSON-only, short sentence-case labels, ICF/ACC/PCC/MCC and Swiss place names untranslated). `translateOpsLabels` keeps its current behaviour and signature by calling the helper.
- New server function `translateTaxonomyLabels` in `src/lib/label-translations.functions.ts`, taking `{ scope: "category" | "vocabulary", names: string[] }`. Gate: `assertEditor` for `category` (Categories is an Editor screen) and `assertPlatformAdmin` for `vocabulary`. The vocabulary prompt gets a hint that terms are directory taxonomy labels (region, credential, coaching format, language).
- The function returns translations only; `articles.categories.tsx` and `vocabularies.tsx` write them through their existing RLS-scoped `supabase` client, so table policies remain the real boundary.
- In both routes: `add()` inserts the row, then patches `name_de` / `name_fr` / `name_it`; a per-row "Translate" button calls the same function for one name and patches only empty fields.
- New CMS strings `taxonomy.translate`, `taxonomy.translating`, `taxonomy.translateFailed` in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- No schema change: `name_de` / `name_fr` / `name_it` already exist on `categories` and every `cf_*` table.

## PR note

- **Summary** — Auto-translate Insights category and Coach Finder vocabulary labels into DE/FR/IT on creation, plus an on-demand per-row translate action, reusing the operational-structure translation path.
- **Changes** — Backend: shared label-translation helper, new `translateTaxonomyLabels` server function; UI: translate-on-add and per-row translate in the Categories and Vocabularies screens; i18n: three new CMS strings per locale.
- **Backend / schema changes** — None.
- **Testing & verification** — Add a category as an Editor and a term on several vocabulary tabs as an Administrator, confirming all three languages fill; edit a translated label and confirm it persists; run "Translate" on a row with one language already filled and confirm that value is untouched; force an AI failure and confirm the row is still created with an inline notice.
- **Risks & rollback** — Low, additive. Each creation costs one AI call. Rollback by removing the calls; existing rows unaffected.
- **Follow-ups / known debt** — No bulk backfill for existing rows; the per-row action covers them one at a time.
