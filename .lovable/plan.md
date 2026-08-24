# Fix: "duplicate key value violates unique constraint event_recaps_event_id_key"

## What is happening

Opening the Recap section of an event shows a red error instead of the editor. The message comes from the database rejecting a second recap row for the same event.

Verified in the database: a recap row for this event already exists (draft, created by a staff account), and the event is published and not internal. So the row is fine — the error is a race, not bad data.

## Root cause

The staff recap functions create the recap row on first open with a *check-then-insert*:

1. read `event_recaps` for this event,
2. if nothing came back, insert a new row.

There is nothing atomic about those two steps. When two of these calls run at the same moment, both read "no row" and both insert; the unique index on `event_id` rejects the loser and the editor surfaces the raw Postgres message.

Two things make the overlap likely rather than rare:

- The editor's load effect depends on the translation function `t`, which is not a stable reference, so the effect can fire again before the first load resolves (and React's development double-mount fires it twice by design).
- Several recap actions each create the row independently (load, save story, save photos, save files), so a save that starts before the load finishes hits the same window.

## The fix

1. **Make row creation atomic** in the staff recap functions: replace the read-then-insert with an insert that ignores an existing row for that event, then read the id back. Whichever call wins, both end up with the same recap id and neither errors.
2. **Stop the duplicate load** in the recap editor: drop the unstable dependency from the load effect and guard against a second load starting while one is in flight.
3. **Show a human message** if any unique-constraint error still escapes, instead of the raw Postgres text.

No schema change, no change to what staff can do, no change to the public event page.

## Technical notes

- `ensureRecap` in `src/lib/event-recaps-admin.functions.ts`: `insert(...).select("id")` with conflict-ignore on `event_id`, falling back to a select when the insert returns no row (the conflict case). All five callers keep the same signature.
- `src/components/cms/EventRecapEditor.tsx`: `useEffect(..., [load])` with a ref guard; friendly copy for constraint errors via the existing `recap.loadError` / `recap.saveError` keys.

## PR note

- **Summary** — The after-event recap editor could try to create a second recap row for the same event and fail with a raw unique-constraint error. Row creation becomes atomic and the editor stops loading twice.
- **Changes** — Backend: atomic recap-row creation in the staff recap server functions. UI: stable load effect plus in-flight guard in the recap editor, friendlier error copy.
- **Backend / schema changes** — None. No migration, no policy change.
- **Testing & verification** — Open the Recap section on an event that already has a recap and on one that has none; save story, photos and files; reload repeatedly and open two tabs at once to force the race; confirm the public event page is unchanged.
- **Risks & rollback** — Very small blast radius, confined to the recap editor path; revert the two files to roll back.
- **Follow-ups / known debt** — The four recap save functions each ensure the row separately; a single "open recap" call returning the id would be cleaner but is not needed for this fix.
