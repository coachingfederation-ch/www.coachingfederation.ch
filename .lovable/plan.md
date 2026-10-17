# Event author and last-edit tracking

## What you get
- **Event editor header**: a small line such as "Created by Anna Muster on 3 Oct 2026 · Last edited by Max Muster on 15 Oct 2026, 14:20".
- **Events list**: a new "Created by" filter (next to Host) listing everyone who has created an event, plus a compact "Edited … by …" hint under each title.

## How it works
- Today an event only stores its current owner (`organizer_id`), which can change when ownership is transferred, and the last edit time — not who made the edit.
- We add two fields: **created by** (set once, never changes) and **last edited by** (updated automatically on every save, including series updates and duplicates).
- Both are filled in by the database itself, so no save path can forget them.
- Existing events: "created by" is backfilled from the current owner (best available guess); "last edited by" stays empty until the next edit and shows "—".

## Technical details
- Migration: `events.created_by uuid null`, `events.updated_by uuid null` (references `profiles`, `ON DELETE SET NULL`); index on `created_by`; backfill `created_by = organizer_id`. BEFORE INSERT trigger sets `created_by = coalesce(created_by, auth.uid())`; BEFORE UPDATE trigger keeps `created_by` immutable and sets `updated_by = auth.uid()` when non-null (service-role/cron writes leave it untouched). Existing RLS unchanged.
- `src/lib/events-admin.functions.ts`: add both columns to the select, resolve names from `profiles` in one batched query, return `createdBy`/`updatedBy` `{id, name}`.
- `manage.events.index.tsx`: `createdBy` search param (zod, default ""), options built from rows like hosts, included in clear-filters/active-filter logic.
- `manage.events.$id.tsx`: metadata line in the header using existing tokens (`text-muted-foreground`).
- EN/DE/FR/IT strings in CMS locales; update `docs/events-and-ticketing.md`; regenerate types.

## PR note
- **Summary**: Records and shows who created an event and who last edited it; adds a creator filter.
- **Backend**: two nullable columns, index, two triggers, backfill. Additive, safe to leave if code is reverted.
- **Testing**: create, edit, duplicate an event as organizer and admin; check header line, list hint, and filter.
- **Risks**: low; backfilled creator may differ for events whose ownership was transferred earlier.
- **Follow-ups**: full edit history is out of scope.
