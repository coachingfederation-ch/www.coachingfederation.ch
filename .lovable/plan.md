# Sort the staff events table by date

## What changes

Add an explicit sort by `starts_at` (descending — newest first, matching the current server order) to the `filtered` rows in `src/routes/_staff/manage.events.index.tsx`, so the table is always ordered by date regardless of what the server returns or how filters slice the rows.

## Technical notes

- In the `filtered` `useMemo`, after `.filter(...)` add `.sort((a, b) => b.starts_at.localeCompare(a.starts_at))`.
- The server function (`listManagedEvents`) already orders by `starts_at` descending, so this is a client-side guarantee, not a behaviour change — it keeps the order stable if the server query ever changes.
- No new dependencies, no i18n, no schema changes.

## PR note

**Summary** — Makes the staff events list always sort by start date (newest first) client-side, so filtering never disturbs the date order.

**Changes** — One sort added to the `filtered` memo in `src/routes/_staff/manage.events.index.tsx`.

**Backend / schema changes** — None.

**Testing & verification** — Load `/manage/events`, confirm rows are newest-first; apply each filter and confirm the date order is preserved.

**Risks & rollback** — Trivial; revert the one-line sort.
