# Subscribable events calendar feed

A live calendar subscription: people add one link to Google, Apple, or Outlook once, and every published event of The Switzerland Chapter of ICF keeps appearing and updating in their own calendar — no re-download after a change.

## What visitors get

On the events page, below the filters, a "Subscribe to calendar" control opens a small dialog with:

- A one-click "Add to Google Calendar" link
- An "Add to Apple / Outlook" link using the `webcal://` scheme
- The raw feed URL with a copy button, for any other client
- A short note that the feed refreshes automatically (clients typically poll every few hours) and shows the next 12 months of events

The dialog respects whatever filters the visitor has active: if they have picked a community, category, region, or language, the generated link is pre-filtered to that selection, with a plain-language line stating what the feed contains. A "whole chapter" option is always offered too.

Everything is localized in DE, FR, IT, EN.

## Feed contents

- Only published, non-internal events, from 30 days in the past through 12 months ahead
- Each entry carries the title, plain-text summary, venue or online link, the event's own timezone, and a link to the event page
- Entries keep a stable identity per event, so an edited date or venue updates the existing entry instead of creating a duplicate
- Cancelled or unpublished events are removed on the next refresh
- No attendee, registration, or member data ever appears in the feed

## Technical notes

- New public route `src/routes/api/public/events-feed[.]ics.ts` serving `/api/public/events-feed.ics`. Reads `events_public` (already excludes drafts) through the server client, filtered by optional `community`, `category`, `region`, `lang`, and `internal=false` always enforced.
- New `src/lib/events-feed.server.ts` building a multi-`VEVENT` VCALENDAR. It reuses the existing escaping, folding, timezone and stamp helpers in `src/lib/event-calendar.ts`; those helpers get exported (currently module-private) plus a new `buildEventsFeedIcs(events, options)`. `buildEventIcs` stays unchanged so the registration and single-event `.ics` paths are untouched.
- Feed-level properties: `X-WR-CALNAME`, `X-WR-CALDESC`, `X-WR-TIMEZONE: Europe/Zurich`, `REFRESH-INTERVAL;VALUE=DURATION:PT6H` and `X-PUBLISHED-TTL:PT6H` so clients poll sensibly. UID per event matches the existing `event-<id>@coachingfederation.ch` form.
- `SEQUENCE` derived from the event's `updated_at` (minutes since a fixed epoch) so edits are picked up as updates.
- Response headers: `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: public, max-age=1800`. Rate limiting via the existing `checkRateLimit` helper in `src/lib/rate-limit.server.ts`, keyed by IP, since this is an anonymous public endpoint.
- New component `src/components/events/SubscribeCalendarDialog.tsx` built from the design system `Dialog`, `Button`, `Input` and the existing copy-to-clipboard pattern; rendered from `src/pages/Events.tsx` next to the filter row, receiving the active filter state.
- i18n: new `events.subscribe.*` keys in the four locale files.

## PR note

**Summary** — Adds a public, auto-updating iCalendar subscription feed for chapter events plus a subscribe dialog on the events page, so visitors keep the chapter's programme in their own calendar without re-downloading files.

**Changes**
- Lib: exported shared ICS primitives from `event-calendar.ts`; new `events-feed.server.ts` builder.
- Route: `GET /api/public/events-feed.ics` with optional community/category/region/language filters, rate limited.
- UI: `SubscribeCalendarDialog` on the events page, filter-aware, with Google, webcal, and copy-URL options.
- i18n: `events.subscribe.*` in DE/FR/IT/EN.

**Backend / Schema Changes** — None. Reads the existing `events_public` view only.

**Testing & Verification** — Feed validated against an iCalendar validator; subscribed in Google Calendar, Apple Calendar and Outlook.com; verified an edited event updates in place rather than duplicating; verified internal and draft events never appear; checked a DST-boundary event; checked filtered variants return only matching events; confirmed anonymous access needs no session.

**Risks & Rollback** — Additive and read-only; revert the route, lib and component to roll back. Existing subscribers would simply see the feed stop resolving.

**Follow-ups** — Per-community subscribe links on community pages are not included; can follow if wanted.
