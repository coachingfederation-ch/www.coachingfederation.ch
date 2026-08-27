# Simplify the event registration controls

## What is there today (verified in code and database)

One dropdown holds five values — `none`, `rsvp`, `rsvp_members`, `rsvp_tickets`,
`rsvp_invited` — and two of the connected settings hang off it awkwardly:

- **"Allow registration without a membership"** only appears for RSVP (members),
  and it silently means "actually, anyone may register" — which is the same
  thing as RSVP (public).
- **Ticket tiers, discount codes** appear only for RSVP (ticket). So a
  members-only event can never sell or hand out tickets, and a ticketed event
  can never be members-only.
- **Guest passes**, **attendance threshold** and **certificates** already appear
  for every mode except "no registration" — they are fine as they are.

One correction to the brief: **CCE is not coupled to RSVP (ticket)** anywhere in
the code or the database. It is an independent extra toggled in the row above
the form (and in the wizard's extras step), and it works with any mode. Nothing
needs to change there; it just reads as coupled because both live in different
places.

## The simplification

Replace the five-value dropdown with two plain questions plus one checkbox.

```text
Registration        ( ) Off — no sign-up
                    (x) On — people register

Who can register    (x) Anyone
                    ( ) Active members only
                    ( ) Invited members only (guest list)

[x] Offer tickets   tiers, prices and discount codes
                    (no tier saved = a plain free RSVP)
```

Everything below that — capacity, opens/closes, guest passes, attendance
percentage, certificates — stays exactly where it is and keeps its current
"only when registration is on" rule.

Consequences:

- Members-only events can now have tickets, free or paid, which is the main
  thing this unlocks.
- Invited-member events can too; the guest-list gate and the tiers are
  independent.
- The "allow registration without a membership" checkbox disappears — choosing
  "Anyone" is that setting.
- Ticket tiers, discount codes and the tickets panel show whenever "Offer
  tickets" is on, regardless of audience. Tiers already saved are never deleted
  when the box is unticked; they simply stop being offered.

The same three controls replace the five choices in the create wizard's "Who can
come" step.

## Technical notes

- **Migration**: add `events.tickets_enabled boolean not null default false`;
  backfill `tickets_enabled = true` and `registration_mode = 'rsvp'` for every
  event currently in `rsvp_tickets`; set `guest_registration_allowed = true` for
  every event that is not `rsvp_members`, so the flag has one meaning only
  ("non-members may register"). The `rsvp_tickets` enum label stays in place,
  unused. Add the new column to the public events view read by
  `src/lib/events.ts`.
- **Server enforcement** (`src/lib/tickets.server.ts`): resolve a tier when
  `tickets_enabled` is true and the event has at least one active tier, instead
  of when the mode is `rsvp_tickets`; keep the members-only and invited-only
  checks keyed on the mode. `tg_event_registration_guard` keeps its
  members-only rule unchanged; the tier/price checks already work off the tier
  row, not the mode.
- **Public panel** (`EventRegistrationPanel.tsx`): `ticketMode` becomes
  `tickets_enabled && hasTiers`; `membersOnly` becomes `mode === 'rsvp_members'`
  (no flag reading). Member-priced tiers stay locked behind confirmed
  membership as today.
- **Editor** (`EventEditorSections.tsx`, `manage.events.$id.tsx`): the two
  radio groups plus the tickets checkbox; tickets/discount panels gate on
  `tickets_enabled`, invitations panel on `rsvp_invited`, waitlist unchanged.
  Include `tickets_enabled` in the save payload and in the tier list fetch.
- **Wizard** (`EventWizard.tsx`): same three controls, and the draft carries
  `ticketsEnabled` instead of the `rsvp_tickets` choice.
- Other readers to update: `events-admin.functions.ts` (validator, duplicate),
  `guest-passes.server.ts`, `guest-passes.functions.ts`, `Events.tsx` badge,
  `event-reporting.server.ts` label.
- New/renamed strings in EN/DE/FR/IT; the now-unused "allow without membership"
  and "RSVP (ticket)" strings are removed.

## PR note

- **Summary** — Collapses five overlapping registration modes and their side
  flags into "registration on/off", "who can register" and "offer tickets", so
  members-only and invited events can also sell or issue tickets.
- **Changes** — UI: new registration block in the event editor and the create
  wizard; ticket/discount panels gated on the new flag. Backend: tier
  resolution keyed on the flag; audience rules unchanged. Content: new strings
  in four languages, obsolete ones removed.
- **Backend / schema changes** — One migration: new `events.tickets_enabled`
  column, backfill of existing ticketed events, normalisation of
  `guest_registration_allowed`, public events view extended. No policy changes.
- **Testing & verification** — Every audience with and without tickets, signed
  out / member / non-member; a ticketed members-only event end to end including
  Stripe checkout; an existing ticketed event after the backfill; the guest-list
  flow; direct server-function calls with a mismatched payload.
- **Risks & rollback** — Blast radius is event registration. Reverting the code
  needs the backfilled events set back to `rsvp_tickets` by hand; the column is
  harmless if left behind.
- **Follow-ups / known debt** — The `rsvp_tickets` enum label stays as dead
  vocabulary until a later cleanup migration.
