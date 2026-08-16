# Filters and pagination for the staff events list

The events table at `/manage/events` currently renders every event in one long
list. This adds a filter bar and pagination so the list stays usable as the
archive grows.

## What you get

A compact filter bar above the table:

- **Search** — free text on the event title.
- **Category** — from the event categories vocabulary.
- **Community** — the active chapter communities.
- **Host** — people listed as hosts on at least one event.
- **City** — cities that actually occur on events (plus an "Online" entry for
  events without a city).
- **Status** — draft / published / cancelled, since it pairs naturally with the
  others.

Filters combine (AND), show the number of matching events, and have a "Clear
filters" reset. Filter state lives in the URL, so a filtered view can be
bookmarked or shared with a colleague.

Below the table: pagination at 25 events per page with previous/next and
"Showing X-Y of Z". Changing a filter resets to page 1.

Two extra columns are added so the filters are visible in the result: Category
and Community (host names appear as a small line under the title).

## Technical notes

- `listManagedEvents` in `src/lib/events-admin.functions.ts` keeps returning all
  rows the organizer may see, but its select is extended with `community_id`,
  the joined category name (`cf_event_categories`), the community name
  (`op_projects`), and host names via `event_hosts` → member profiles. Filtering
  and paging happen client-side; at the current volume (tens to low hundreds of
  events) this avoids a second round trip per keystroke. If the archive later
  passes ~1000 events, the same filter shape can move into the server function.
- Filter state is read from search params using `validateSearch` +
  `zodValidator` with `fallback()` defaults on the route
  (`src/routes/_staff/manage.events.index.tsx`), following the pattern already
  used on the public events page.
- Filter option lists are derived from the loaded rows, except categories and
  communities which come from the existing vocabulary loaders
  (`listCommunityOptions` and the event categories query used by the editor), so
  labels stay consistent with the editor dropdowns.
- New i18n keys under `events.filters.*` and `events.pagination.*` in
  `src/i18n/locales/{en,de,fr,it}/cms.json`.
- Styling reuses the existing CMS controls (rounded selects, `bg-card` table,
  border tokens) — no new visual patterns.

## PR note

**Summary** — Adds category/community/host/city/status filtering, title search
and 25-per-page pagination to the staff events list so the CMS stays workable as
the event archive grows.

**Changes**
- UI: filter bar, result count, pagination controls, Category/Community columns
  and host line in `src/routes/_staff/manage.events.index.tsx`.
- Data: extended select in `listManagedEvents` (category name, community, hosts).
- i18n: new `events.filters.*` / `events.pagination.*` keys in four locales.

**Backend / schema changes** — None. No migrations, no policy changes; only an
extended read on tables staff can already read.

**Testing & verification** — Load `/manage/events` as an organizer and as an
editor; check each filter alone and combined, empty-result state, page
navigation, filter change resetting to page 1, and that URL state restores on
reload. Verify hosts and category labels match the event editor.

**Risks & rollback** — Contained to one route plus one read query; reverting the
route file and the select restores current behaviour. No data risk.

**Follow-ups** — Server-side filtering/paging if the archive grows past roughly
a thousand events; date-range filter is not included.
