# Update later dates of a repeating series from the parent

Today a repeating event is created once and every date then lives on its own. If
the wording, image, place or registration setup changes, staff have to edit each
date by hand. This adds a way to push those changes forward from one date to all
later ones.

## Who the parent is

The parent of a series is always the **next date that has not started yet**. The
first upcoming date of the series carries the current truth; dates that already
happened are history and can never push changes.

So the new panel only appears on that one event. On a passed date, or a later
date in the same series, the panel shows a short line naming which date is the
parent, with a link to it.

## What staff see and do

At the bottom of the event editor, under the repeat panel, a new
"Update later dates" block:

- Lists the later dates of the series with their day and status.
- A button "Apply to later dates". It is disabled while there are unsaved edits
  ("Save your changes first."), the same rule the repeat panel already uses.
- After running: "3 dates updated, 1 skipped because it was edited by hand" —
  with the skipped dates named.

What travels: title, summary, description, language, image and credit, location
(mode, venue, city, online link, map), category, region, community, registration
settings, guest passes, tickets flag, hero marks, practical notes, and the host
list.

What never travels: the date and time, the slug, the status (a published later
date stays published, a draft stays draft), "featured", capacity taken by
registrations, and anything attendee-related.

A later date counts as **edited by hand** when any of the fields above differs
from the parent's previous stored value. Those dates are skipped and reported,
never overwritten. Untouched dates are updated.

## Technical notes

- `src/lib/events-admin.functions.ts`: new `applySeriesUpdate` server fn
  (`assertOrganizer`, caller's client so RLS still decides ownership). It loads
  the parent, verifies it is the earliest not-yet-started event of its
  `series_id`, loads all siblings with `starts_at > parent.starts_at`, and for
  each compares the propagated fields against a snapshot to detect hand edits.
  Returns `{ updated, skipped: [{ id, slug, starts_at }] }`. Hosts are replaced
  wholesale on updated occurrences only.
- Snapshot for the hand-edit check: one new nullable column
  `events.series_synced_at timestamptz` plus `events.series_source_hash text`,
  written on generation and on each successful apply. A child whose current
  field hash differs from its stored `series_source_hash` is treated as
  hand-edited. This avoids a second copy of the content.
  `generateEventOccurrences` writes both on insert.
- `src/lib/events-series.ts` (new, pure): the propagated field list, the hash
  helper, and `isSeriesParent(event, siblings)` — shared by the server fn and the
  editor so the UI and the server agree.
- `src/components/cms/EventEditorSections.tsx`: new `EventSeriesUpdateSection`
  built from the existing `Section`/`Field` primitives and design-system
  `Button`; no new styling values.
- `src/routes/_staff/manage.events.$id.tsx`: loads the siblings of the series,
  renders the new section under `EventRepeatSection`, reuses the existing
  `dirty` flag, shows the result message and refreshes.
- i18n: new `events.series.*` keys in `cms.json` for en/de/fr/it.
- Public site, registrations, tickets and translations are untouched.

## PR note

**Summary** — Staff can push content and setup changes from the next upcoming
date of a repeating series to all later dates, without touching timing, status
or hand-edited dates.

**Changes**
- UI: "Update later dates" panel in the staff event editor, visible only on the
  series parent; sibling list, gated apply button, result summary.
- Backend: `applySeriesUpdate` server fn; shared pure helpers for the propagated
  field set and hand-edit detection.
- i18n: `events.series.*` in four languages.

**Backend / schema changes** — one migration adding nullable
`events.series_synced_at` and `events.series_source_hash`. No RLS change:
writes go through the caller's client under the existing events policies.

**Testing & verification** — Series with mixed draft/published later dates:
edit the parent, apply, confirm content copied and dates/status untouched;
hand-edit one later date and confirm it is skipped and named; confirm the panel
is hidden on passed dates and on later dates (link to the parent instead);
confirm the button is disabled with unsaved edits; check as organizer (own
events only) and as editor.

**Risks & rollback** — Writes to sibling events, so blast radius is one series
per action; the hand-edit guard keeps deliberate edits safe. Reverting the code
leaves the two nullable columns harmlessly in place.

**Follow-ups / known debt** — No per-field or per-date selection, no undo of an
apply, and no bulk publish of a series; deliberate for now. Docs:
`docs/events-team-communities.md` and `docs/code-map.md` updated in the same
change.
