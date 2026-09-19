# Copy an event

Add a "Duplicate this event" action on a single event's editing page. It creates
a new draft event on a date you choose, carrying over everything reusable, and
takes you straight into the new event.

## What you will see

On the event page, a new panel near the repeat-dates section:

- Button "Duplicate this event"
- A small dialog asks for the new date and time (pre-filled with the original
  date, so a same-day copy is one click away)
- On confirm: the copy is created as a **draft** and the page opens it

## What gets copied

Copied: title (with " (copy)" appended so the two are told apart), summary,
description, language, hero image and credit, location and venue, online link,
map, practical notes, hero marks, capacity, registration mode, guest and ticket
settings, category, community, region, hosts (including their per-event link and
presentation text), speakers, ticket tiers (prices, names, limits — reset to
zero sold), and existing translations.

Not copied: registrations, waitlist, invitations, discount codes, attendance,
certificates, CCE application, recap and recap files, series membership,
"featured" flag, published status.

The copy's end time keeps the original event's duration, measured from the new
start.

## Technical notes

- New server function `duplicateEvent` in `src/lib/events-admin.functions.ts`,
  guarded by `requireSupabaseAuth` + `assertOrganizer`, input
  `{ id: uuid, startsAt: ISO string }`, returns the new event id.
  - Loads the source with `EDIT_COLUMNS`; reuses the field list already used by
    `generateEventOccurrences` for the row copy (same is_internal derivation,
    `is_featured: false`, `status: "draft"`, `organizer_id: context.userId`,
    `series_id: null`, no recurrence).
  - Slug: base slug plus a `-copy` suffix, with a numeric suffix until free
    (checked against `events.slug`).
  - Child rows copied with the same insert pattern as the series copy:
    `event_hosts` (profile_id, sort_order, link_url, blurb),
    `event_speaker_links` (speaker_id, sort_order),
    `event_ticket_tiers` (all configuration columns, `is_active` preserved),
    `event_translations` (per-language title/summary/description rows).
- New UI component `src/components/cms/EventDuplicateSection.tsx` following the
  shape of `EventRepeatSection` (design-system `Card`, `Button`, `Input`,
  `Dialog`); wired into `manage.events.$id.tsx` next to the repeat section, and
  navigating to `/manage/events/$id` for the new id on success.
  - Requires no unsaved changes (same `dirty` guard and `events.repeat.needsSave`
    message as the repeat/series panels), because the copy reads the stored row.
- New i18n keys under `events.duplicate.*` in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- No schema or policy changes.

## PR note

**Summary** — Staff can duplicate an existing event into a new draft on a chosen
date, copying content, hosts, speakers, ticket tiers and translations, so a
recurring-but-not-series event does not have to be rebuilt by hand.

**Changes**
- Backend: `duplicateEvent` server function (organizer-guarded) copying the event
  row plus hosts, speakers, ticket tiers and translations; unique slug derivation.
- UI: `EventDuplicateSection` panel on the event editing page with a date/time
  dialog; navigates to the new draft.
- i18n: `events.duplicate.*` keys in en/de/fr/it.
- Docs: "Duplicating an event" section in `docs/events-and-ticketing.md`; entry
  in `docs/code-map.md`.

**Backend / Schema Changes** — None (no migration; reads and inserts only).

**Testing & Verification** — Duplicate an event with hosts, speakers and ticket
tiers; verify the copy is a draft, on the chosen date, with the right duration,
no registrations, and a unique slug. Verify a second duplicate of the same event
gets a distinct slug. Verify an organizer cannot duplicate another organizer's
event beyond their existing permissions. Typecheck, build, Prettier, Playwright
pass on the event page.

**Risks & Rollback** — Additive; no migration. Worst case a stray draft event is
created, which staff can delete. Revert by removing the server function, the
component and the i18n keys.

**Follow-ups** — Duplicating from the events list row is not included; copying
custom forms and discount codes is deliberately out of scope for now.
