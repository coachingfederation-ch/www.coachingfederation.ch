# Registration modes for events

## How it works today (verified in code and schema)

The database stores two independent switches on each event:

- `registration_mode`: only `none` or `rsvp`.
- `guest_registration_allowed`: a boolean. When it is off, the public panel
  hides the form and shows "members only" plus a sign-in button — but the check
  is only "is there an account?", not "is this an active member". A signed-in
  non-member can register.

Ticket tiers are a separate concept: the tickets section is always visible in
the event editor, and the public panel shows tiers whenever any active tier
exists. There is no "ticket" mode. Member-priced tiers are already gated by
verified membership (account link or verified ICF member ID).

So your model is close, but three things do not exist yet: a real members-only
mode, a real ticket mode, and any link between the selected mode and whether
the ticket tiers section appears.

## The four modes to build

```text
No registration (open)   -> nothing to submit, just "come along"
RSVP (public)            -> anyone, signed in or not
RSVP (members)           -> active ICF membership required
     [x] Allow registration without a membership   (falls back to public)
RSVP (ticket)            -> always public; ticket tiers shown and required
```

### Behaviour per mode

- **No registration** — unchanged. No form, no tiers.
- **RSVP (public)** — name, email, custom questions. No tiers offered even if
  some exist on the event.
- **RSVP (members)** — the panel asks the visitor to sign in *or* enter an ICF
  member ID, which is verified against an active member record (the existing
  rate-limited check). Without confirmed membership the form stays locked, and
  the server refuses the submission too. With the "allow without a membership"
  flag on, the form is open to everyone and the member prompt becomes an
  optional note.
- **RSVP (ticket)** — open to everyone. Tiers are listed; a tier must be
  chosen. Member-priced tiers stay locked until membership is confirmed, which
  is exactly today's behaviour. Free and paid tiers both work; paid goes to
  Stripe checkout as now.

### Editor

- The mode dropdown gains the two new options.
- The "allow registration without a membership" checkbox only appears for
  RSVP (members) — its label is corrected to talk about membership, not
  accounts.
- The **ticket tiers section only renders when the mode is RSVP (ticket)**,
  with a short hint above it. Tiers already saved on an event are not deleted
  when the mode changes; they simply stop being offered.

## Technical notes

- Migration: add `rsvp_members` and `rsvp_tickets` to the
  `event_registration_mode` enum, then backfill — events in `rsvp` that have at
  least one active ticket tier become `rsvp_tickets`; all other `rsvp` events
  stay `rsvp` (public) and keep their current guest flag. Enum values must be
  added in a separate statement from the backfill (Postgres commits the new
  label first).
- `guest_registration_allowed` is reused as the "allow without a membership"
  flag; its meaning changes from account to membership, and it is only read in
  `rsvp_members` mode.
- `src/lib/tickets.server.ts` — membership requirement enforced server-side for
  `rsvp_members`; tier selection required for `rsvp_tickets` and ignored for
  `rsvp`.
- `src/lib/events.functions.ts` — both submit paths refuse a submission that
  does not satisfy the event's mode.
- `src/components/events/EventRegistrationPanel.tsx` — replace the
  `rsvpMode` / `guestsBlocked` pair with a single derived mode, drive tier
  rendering and the member block from it.
- `src/components/cms/EventEditorSections.tsx` and
  `src/routes/_staff/manage.events.$id.tsx` — new options, conditional flag,
  conditional tickets section.
- `src/lib/events.ts`, `src/pages/Events.tsx` — treat all three rsvp values as
  "registration" for the card badge.
- New i18n strings for the two modes and the members-only prompt in EN/DE/FR/IT.

## PR note

- **Summary** — Replaces the mode/flag pair with four explicit registration
  modes so organisers can run open, public-RSVP, members-only and ticketed
  events, and only see ticket tiers when the event is ticketed.
- **Changes** — UI: mode dropdown, conditional membership flag, conditional
  tickets section, mode-driven public panel. Backend: enum extension and
  backfill, server-side enforcement of membership and tier requirements.
  Content: new strings in four languages.
- **Backend / schema changes** — One migration: two new enum values plus a
  backfill of existing rsvp events with tiers. No table or policy changes.
- **Testing & verification** — Each mode signed out, signed in as a member,
  signed in as a non-member; member ID valid/invalid in members mode; ticket
  mode with free tier, paid tier and sold-out tier; existing events checked
  after backfill; direct server-function calls with a mismatched payload.
- **Risks & rollback** — Blast radius is event registration only. Code revert
  is safe; the enum values can stay (unused labels are harmless), but events
  backfilled to `rsvp_tickets` would need to be set back to `rsvp` by hand.
- **Follow-ups / known debt** — Members-only ticketed events are not supported
  by choice; if wanted later, the flag can be extended to ticket mode.
