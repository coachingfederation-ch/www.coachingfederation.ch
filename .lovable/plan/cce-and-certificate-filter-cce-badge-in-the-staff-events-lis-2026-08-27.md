# CCE and certificate filter + CCE badge in the staff events list

Staff can already flag an event as offering CCE credits or completion certificates in the event editor, but the events list neither shows nor filters on those flags. This adds both.

## What changes

1. **New filter** in the events list filter bar, next to Category / Community / Host / City:
   - All events (default)
   - CCE events
   - Certificate events
   - CCE or certificate events
2. **New "CCE" badge** next to the event title in the list, shown when the event offers CCE credits — same pill treatment as the existing "Members only" and repeat badges, using the yellow accent so it reads as the credential marker.
3. The new filter is part of the saved filter set (session-remembered) and is reset by "Clear filters".

## Technical notes

- `src/lib/events-admin.functions.ts`: add `cce_enabled` and `certificates_enabled` to `LIST_COLUMNS` and to the `ListedEvent` type / row mapping (they are already selected for the editor, so no schema change is needed).
- `src/routes/_staff/manage.events.index.tsx`:
  - extend `searchSchema` with `credits` (`"" | "cce" | "certificates" | "any"`), include it in `isPristine`, the `hasFilters` check and the clear-filters payload;
  - add the filter row entry (reusing the existing `FilterSelect` with a fixed option list) and the matching predicate in the `filtered` memo;
  - render the CCE badge in the title cell.
- `src/i18n/locales/{en,de,fr,it}/cms.json`: add `events.filters.credits`, `events.filters.allCredits`, `events.filters.cceOnly`, `events.filters.certificatesOnly`, `events.filters.creditsAny` and `events.tag.cce`.
- No database, RLS, or business-logic changes.

## PR note

- **Summary** — Surface the existing CCE / certificate event flags in the staff events list as a filter and a title badge.
- **Changes** — UI: new credits filter control, CCE badge; data: two extra columns in the staff list query; i18n: six new keys in four locales.
- **Backend / Schema changes** — None.
- **Testing & Verification** — Load `/manage/events` as staff, confirm the badge appears only on CCE events, each filter option narrows the list correctly, the count updates, the filter survives navigating into an event and back, and "Clear filters" resets it. Check all four languages render the new labels.
- **Risks & Rollback** — Low; presentation-only, revert by undoing the three file groups.
- **Follow-ups** — Could later filter by CCE application status (draft / submitted / approved) rather than just the flag.
