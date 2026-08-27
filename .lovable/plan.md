# Auto-set event end time from the start time

When staff pick a start date and time for an event, the end field fills itself in automatically with the same date and time plus two hours.

## Behaviour

- Editing "Starts" sets "Ends" to start + 2 hours.
- Applies in both places a start time is entered: the event editor's "When" section and the guided new-event wizard's first step.
- Staff can still overwrite the end afterwards; editing "Ends" never changes the start.
- Only a start-field edit triggers the update — loading an existing event leaves its stored end untouched.

## Technical notes

- `src/components/cms/EventEditorSections.tsx`, `EventDetailsSection`: the "Starts" `onChange` currently patches `starts_at` only. It will patch `ends_at` as well, computed from the parsed start ISO plus 2h (existing `fromLocalInput` / `toLocalInput` helpers, no timezone-handling change).
- `src/components/cms/event-wizard/EventWizard.tsx`, basics step: the `startsLocal` `onChange` will also set `endsLocal` to the same local value plus 2 hours, kept as a `datetime-local` string so the draft shape is unchanged.
- A small shared helper (e.g. `addHoursToLocalInput`) placed next to the existing local-input helpers avoids duplicating the arithmetic in both files.
- No schema, server-function, or validation changes; purely form behaviour.

## PR note

**Summary** — Entering an event start date now pre-fills the end date with start + 2 hours in both the event editor and the creation wizard, removing a repetitive manual step.

**Changes**
- UI: start-field change handlers in the event editor's "When" section and the wizard basics step also set the end value.
- Shared date helper for adding hours to a `datetime-local` value.

**Backend / Schema Changes** — None.

**Testing & Verification** — Create a new event through the wizard and confirm the end fills in two hours after the chosen start; edit an existing event's start and confirm the end follows; overwrite the end manually and confirm it sticks until the start is edited again; confirm saving stores the expected UTC instants.

**Risks & Rollback** — Low blast radius, presentation-only. Rollback by reverting the two change handlers. One behavioural note: an event with a deliberately non-two-hour duration will have its end reset if staff re-edit the start.

**Follow-ups / Known Debt** — The editor still works in the browser's local timezone rather than the event's stored timezone (existing known limitation, unchanged here).
