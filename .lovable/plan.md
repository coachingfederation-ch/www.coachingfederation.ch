# Move technical limits to Integration

The "Technical limits" box currently sits on Coach Finder settings, but three of its
four values are member-sync concerns. They move to the Integration page; the one
value that really is a directory display setting stays where it is.

## What changes

Moves to Integration (new "Technical limits" card, placed under the sync/health cards):

- Member feed drop threshold (%)
- Import history retention (months)
- CSV export row limit

Stays on Coach Finder, folded into the existing "Display" box next to Default sort:

- Results per page — this controls the public directory listing, not the sync.

After the move the Coach Finder page has two boxes (Finder modes, Display) and no
"Technical limits" section.

## Technical details

- New component `src/components/cms/SyncLimitsCard.tsx`: loads the row through the
  existing staff-gated `getCoachFinderConfigForStaff()`, saves with the same
  `coach_finder_config` update-on-blur pattern used today, and reuses the Integration
  page's `CARD` shell, heading and status-line conventions. No schema change — the
  columns stay on `coach_finder_config`.
- `src/routes/_staff/integration.tsx`: render the new card. The route is admin-only,
  which matches the platform-admin gate on the Coach Finder page.
- `src/routes/_staff/coach-finder.tsx`: drop the tunables section and the three moved
  entries from `NUMBERS`; render "Results per page" inside the Display section.
- i18n: add an `integration.limits*` group (title, help text, three field labels) in
  EN/DE/FR/IT, keep `finder.numbers.pageSize`, remove the three moved keys from
  `finder.numbers`, and reword `finder.subtitle` so it no longer mentions the sync.

## PR note

- **Summary** — Relocates the three member-sync tuning values from Coach Finder
  settings to the Integration page, so each setting lives with the system it affects.
- **Changes** — UI only: new `SyncLimitsCard` on Integration, trimmed Coach Finder
  page, i18n key moves in four locales.
- **Backend / schema changes** — None.
- **Testing & verification** — Load `/manage/integration` as an admin, change each of
  the three values and confirm the save indicator and a reload keep the value; confirm
  Coach Finder still saves "Results per page"; check the three other locales render
  labels rather than raw keys.
- **Risks & rollback** — Low; presentation-only, revert by restoring the section.
- **Follow-ups** — None.
