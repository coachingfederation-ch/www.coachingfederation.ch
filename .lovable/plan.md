# Derive "For members only" from the registration audience

## What is there today (verified in code)

`is_internal` ("For members only") is a checkbox in the event editor's first
section and in the create wizard. It is a pure marker — it does not restrict
anything:

- excludes the event from the public subscribable ICS feed
- puts the event under the "Members" audience filter on `/events`
- shows a "Members only" tag on the event card and detail page
- lists the event on the member home page and in the staff event list badge

Who may actually register comes only from the registration block
(`registration_mode` = anyone / active members only / invited members only) and
is enforced in `src/lib/tickets.server.ts` and the database guard
`tg_event_registration_guard`. The two can disagree today: an event badged
"For members only" can still accept anyone.

## The change

Remove the checkbox and derive the flag from the audience the organiser already
picks:

```text
Registration off                 -> not members only
Who can register: Anyone         -> not members only
Who can register: Active members -> members only
Who can register: Invited members-> members only
```

So the "Members only" badge, the member home listing and the ICS exclusion
follow the real seat policy automatically, and there is one control instead of
two.

Consequence to accept: an event with registration switched off can no longer be
badged members-only. Nothing in the current data model expresses "no sign-up,
members only" other than this flag; if that case matters later it should be its
own explicit audience option rather than a second checkbox.

## Technical notes

- **Server** (`src/lib/events-admin.functions.ts`): drop `is_internal` from the
  input schema and compute it in `normalize()` as
  `registration_mode === "rsvp_members" || registration_mode === "rsvp_invited"`.
  Same derivation on create, update and duplicate, so a direct server-function
  call cannot set a contradictory value.
- **Editor** (`src/components/cms/EventEditorSections.tsx`): remove the
  `fieldInternal` field and the `is_internal` key from the save payload in
  `src/routes/_staff/manage.events.$id.tsx`. Add a one-line hint under the
  audience radio group saying that members-only events are hidden from the
  public calendar feed and shown to members.
- **Wizard** (`EventWizard.tsx`): remove the `isInternal` draft field, its
  checkbox, and the AI-summary phrasing that reads it; derive the value from the
  chosen audience when building the create payload.
- **Readers stay unchanged** — `events.ts`, `events-feed.server.ts`,
  `Events.tsx`, `EventDetail.tsx`, `MemberHome.tsx`,
  `manage.events.index.tsx`, `chapter-overview.server.ts` keep reading
  `is_internal`; only the writers change.
- **Migration**: backfill
  `is_internal = registration_mode in ('rsvp_members','rsvp_invited')` for all
  existing events so the badge matches the policy from day one. Column, view and
  policies unchanged.
- **Copy**: remove the now-unused `events.fieldInternal` string and the wizard's
  internal-audience label in EN/DE/FR/IT; add the new hint string.

## PR note

- **Summary** — Removes the standalone "For members only" checkbox and derives
  the flag from the registration audience, so the members-only badge, member
  listing and calendar-feed exclusion can no longer contradict who may actually
  register.
- **Changes** — UI: checkbox removed from the event editor and the create
  wizard, hint added under the audience group. Backend: flag computed in the
  event create/update/duplicate normaliser instead of accepted from the client.
  Content: obsolete strings removed, one hint string added in four languages.
- **Backend / schema changes** — One migration: backfill of `events.is_internal`
  from `registration_mode`. No table, column or policy changes.
- **Testing & verification** — Each audience saved from the editor and from the
  wizard, checking the resulting badge, `/events` audience filter, member home
  listing and the public ICS feed; duplicating an event; a direct server-function
  call carrying a stray `is_internal` (must be ignored); existing events checked
  after the backfill.
- **Risks & rollback** — Blast radius is event visibility labelling only; no
  registration behaviour changes. Reverting the code restores the checkbox; the
  backfilled values stay and would then be editable again by hand.
- **Follow-ups / known debt** — "No registration, members only" is not
  expressible after this change; if needed, add it as an explicit audience option
  rather than reinstating the checkbox.
