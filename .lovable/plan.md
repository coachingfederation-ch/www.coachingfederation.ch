# Coach Finder: make "Random" a real default sort

Verified current behaviour before planning:

- `coach_finder_config.default_sort` is read in `src/lib/directory.functions.ts` (line 76) but never used — every result page is ordered `full_name` ascending (line 159).
- Random ordering exists only for one narrow case: the unfiltered first view asks for a showcase of eight (`sample: 8`), and the server shuffles ids for that request only. Any filter, or page 2, falls back to alphabetical.
- The CMS select on Coach Finder offers only Name, Credential and Recently updated — there is no Random option, and Credential / Recently updated do nothing either.

So random is not implemented as a sort; it is a one-off showcase. This plan makes the setting real.

## What changes

- The Coach Finder settings screen gains a **Random** option for the default sort, and it becomes the chapter default.
- With Random selected, the public directory lists coaches in a shuffled order instead of alphabetically — every published coach gets equal exposure, not just names starting with A.
- The shuffle is stable while a visitor browses: paging, filtering and re-rendering keep the same order, and a fresh visit produces a new one.
- The other options start working too: Name (A–Z), Credential (MCC, PCC, ACC, then name), Recently updated (newest first).

## Technical notes

- Add `"random"` to the option list in `src/routes/_staff/coach-finder.tsx` and a `finder.sort.random` string in `cms.json` for en/de/fr/it.
- `queryCoachDirectory` in `src/lib/directory.functions.ts` applies the configured sort to the ranged branch instead of the hardcoded `.order("full_name")`:
  - `name` → `full_name` asc
  - `recent` → `updated_at` desc, `full_name` asc as tiebreak
  - `credential` → order by `credential_slug` rank then `full_name`
  - `random` → seeded shuffle (below)
- Seeded random: the client already generates a per-mount `shuffleSeed` in `useCoachDirectoryFilters.ts` and the input schema already accepts `seed`. Extend that so the seed is always sent (not just for the showcase). Server-side, when the effective sort is `random`, fetch the matching `profile_id` list, shuffle it with a small seeded PRNG derived from `seed`, slice the requested page, then fetch and re-order those rows — the same technique the existing showcase branch uses, but deterministic and page-aware.
- Keep the existing `sample` showcase branch as is; it stays the unfiltered hero case.
- Data change: set `coach_finder_config.default_sort` to `random` in a small migration so the live site picks it up without a manual edit.
- No schema change beyond that value; `default_sort` is already a text column.

## Still pending from the previous request

Auto-translation for Categories and Vocabularies has not been implemented yet. It can follow as a separate change once this one is approved.

## PR note

- **Summary** — Makes `coach_finder_config.default_sort` actually drive public directory ordering and adds a Random option, set as the new default.
- **Changes** — Backend: sort handling and a seeded random branch in `queryCoachDirectory`; UI: Random option in the Coach Finder settings select, seed always passed from the directory hook; i18n: one new CMS string per locale; migration: set the config value to `random`.
- **Backend / schema changes** — One data-only migration setting `default_sort = 'random'`. No structural change.
- **Testing & verification** — Switch the setting through all four values and confirm the public list order changes; page through results and confirm no coach repeats or disappears under Random; apply filters and confirm the order stays stable; reload and confirm a different order.
- **Risks & rollback** — Contained to directory ordering. Random paging fetches an id list per query, so watch response time as the directory grows. Rollback by restoring the hardcoded name order and setting the config back to `name`.
- **Follow-ups / known debt** — If the directory grows large, move the seeded shuffle into a database-side ordering expression instead of fetching the id list in the server function.
