# "Live now" badge for running events

Show a small badge on events that are happening right now — in the staff events
list and on the public events page.

## What counts as live

An event is live when its start time has passed and it has not ended yet.
Events without an end time are treated as live for two hours after the start,
so a badge never sticks around all day.

Cancelled and draft events never show the badge.

## Where the badge appears

- Staff events list (`/manage/events`): a small "Live" pill next to the status
  badge on the row. The derived "Passed" status stays as is once the event is
  over.
- Public events page (`/events`): a "Live now" pill in the tag row of both the
  featured card and the grid cards, alongside the existing "Members only" and
  "Full" chips.
- Public event detail page (`/events/:slug`): the same pill next to the date
  line, so someone arriving from a link sees it too.

Copy is localized in EN, DE, FR, IT.

## Technical notes

- Add `isLiveEvent(startsAt, endsAt)` to `src/lib/events.ts` next to
  `hasEventStarted` / `isPastEvent`, using the two-hour fallback window.
- Because "live" is time-dependent, the badge is computed client-side with a
  one-minute ticker (a small `useNowMinute` hook) so a page left open flips the
  badge on and off without a reload. Server-rendered markup simply shows the
  state at request time.
- New i18n key `events.tag.live` (public) and `events.status.live` (CMS), added
  to all four locales.
- No database, schema, or query changes — the badge is derived from
  `starts_at` / `ends_at` already returned by the list queries. Public
  "upcoming" filtering already uses `ends_at`, so a running event stays in the
  upcoming list.

## PR note

**Summary** — Adds a derived "live now" indicator to running events in the
staff events list, the public events list, and the public event detail page.

**Changes**
- UI: live pill on staff list rows, public featured/grid cards, event detail.
- Lib: `isLiveEvent` helper plus a minute ticker hook.
- i18n: new live label in EN/DE/FR/IT.

**Backend / Schema Changes** — None.

**Testing & Verification** — Verify against an event currently in progress, an
event with no end time (badge for two hours), a cancelled event (no badge), and
a past event (no badge, still "Passed" in the CMS). Check the badge appears in
all four languages.

**Risks & Rollback** — Presentation only; revert the diff to remove.

**Follow-ups** — The two-hour default for events without an end time is a
convention, not a stored value; if that proves wrong we can require an end time
in the event wizard instead.
