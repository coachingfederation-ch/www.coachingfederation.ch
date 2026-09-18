# Pagination for the unfiltered Coach Finder

Today the first, unfiltered view of **Find a coach** shows a random showcase of
8 coaches with no way to see the rest — the prev/next buttons only appear once a
filter is applied. This adds simple forward/backward paging to that first view
too.

## What changes for visitors

- The unfiltered list keeps showing 8 coaches at a time, in the same shuffled
  order, and now has **Previous / Next** buttons underneath whenever more
  coaches exist.
- The order stays stable while paging: a coach seen on page 1 never reappears on
  page 2. Reloading the page reshuffles, as it does today.
- The count line becomes a range, e.g. "Showing 1–8 of 9 coaches", so it stays
  correct on later pages.
- Filtered results are unchanged (full result set, alphabetical, existing
  pagination at the configured page size).

## Technical notes

**Server — `src/lib/directory.functions.ts`**
- The `sample` branch currently only runs for `page === 0` and always returns
  the first 8 of the shuffled id list. Change it to treat `sample` as the page
  size for the unfiltered view: run for any page, slice
  `ordered.slice(page * sample, page * sample + sample)`, and return
  `{ page, pageSize: sample, total, sampled: true }`.
- The shuffle is already seeded (`orderProfileIds(..., "random", seed)`) and the
  seed is stable per visit, so slices across pages stay consistent and
  non-overlapping.

**Hook — `src/components/coaches/directory/useCoachDirectoryFilters.ts`**
- `sampled` drops the `page === 0` condition: the unfiltered view is sampled on
  every page.
- `hasMore` includes the sampled case: `(page + 1) * pageSize < total`, still
  suppressed while the free-text/availability narrowing is active.
- Count label: when sampled, use a new range string with `{from}`, `{to}` and
  `{total}` instead of the current "Showing 8 of N" wording.

**UI — `src/components/coaches/directory/CoachResultsGrid.tsx`**
- Drop the `isSample` suppression of the pagination controls; they render
  whenever `page > 0 || hasMore`. `isSample` stays as a prop only if still used
  elsewhere, otherwise it is removed together with its pass-through in
  `directory.tsx`.

**i18n**
- Add `directory.results.sampleRange` (and the mode-specific
  `sampleRangeMode`) to `en`, `de`, `fr`, `it` `directory.json`; remove the now
  unused `sample` / `sampleMode` keys.

**Docs**
- Update the Coach Finder section of `docs/public-directory.md`: the unfiltered
  view is a seeded random ordering paged 8 at a time, not a one-shot showcase.

## PR note

- **Summary** — The unfiltered Coach Finder can now be paged forward and
  backward through all published coaches, 8 per page, in a stable seeded random
  order.
- **Changes** — Backend read path: sample branch becomes a seeded paged slice.
  UI: pagination no longer hidden for the unfiltered view; range count label.
  i18n: new range keys in four locales. Docs: `public-directory.md`.
- **Backend / schema changes** — None. No migration; same view, same policies.
- **Testing & verification** — Load `/find-a-coach` unfiltered: 8 cards, Next
  enabled, page 2 shows the remaining coaches with no duplicates, Previous
  returns to the identical page 1; reload reshuffles; apply a filter and confirm
  the existing paged behaviour and page size are unchanged; check the count line
  and empty state in all four locales.
- **Risks & rollback** — Low, confined to the public finder read path and its
  UI. Revert the three files plus locale strings.
- **Follow-ups** — None. Page size for the unfiltered view stays hard-coded at
  8; making it a Coach Finder config value is a possible later step.
