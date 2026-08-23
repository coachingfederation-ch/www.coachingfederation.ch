# Create repeat dates only after the event is published

Today the repeat panel sits directly under the timing fields and its "Create dates"
button copies the event straight away, using whatever the server currently has
stored. That means dates can be spawned from a half-finished draft, and any edits
still open in the form are missing from the copies.

## What changes

1. The repeat panel moves to the very bottom of the event editor, after
   publishing, tickets and attendees — it reads as the last step.
2. "Create dates" only works once the event is published and there is nothing
   unsaved in the form. While either is missing, the button is disabled and the
   panel explains why:
   - draft or cancelled event: "Publish this event before creating repeat dates."
   - unsaved edits: "Save your changes first."
   The date preview stays visible in both cases, so staff can still see what would
   be created.
3. The server refuses the request too, so the rule holds even outside the UI: an
   occurrence request for an event that is not published is rejected with a clear
   message.

## Technical notes

- `src/routes/_staff/manage.events.$id.tsx`: move `<EventRepeatSection>` below
  `<EventPublishingSection>`; keep a copy of the loaded row in state and compare it
  with the edited `event` to derive a `dirty` flag; pass `dirty` and
  `event.status` into the section.
- `src/components/cms/EventEditorSections.tsx` (`EventRepeatSection`): accept
  `canCreate` / `blockedReason` props, disable the create button and render the
  reason line; button styling switches to the design system `Button` while it is
  being touched.
- `src/lib/events-admin.functions.ts` (`generateEventOccurrences`): load the source
  event's `status` and throw when it is not `published`.
- New i18n keys for the two blocked reasons in the CMS strings file, in all four
  languages.

## PR note

**Summary** — Repeat dates for an event can only be generated once the event is
published and saved, and the repeat panel becomes the final step of the editor.

**Changes**
- UI: repeat section moved to the bottom of the event editor; create button gated
  on published + no unsaved edits, with an inline reason.
- Backend: `generateEventOccurrences` rejects non-published source events.
- i18n: two new CMS strings (DE, FR, IT, EN).

**Backend / schema changes** — None (server-function guard only, no migration).

**Testing & verification** — Draft event: button disabled with publish hint;
published event with an unsaved title edit: disabled with save hint; published and
saved: dates create as before and the series list reloads. Server guard checked by
calling the function against a draft event.

**Risks & rollback** — Small blast radius, confined to the repeat panel and one
server function. Reverting the two files restores previous behaviour; no data
migration to undo.

**Follow-ups / known debt** — The dirty check is a shallow comparison of the edited
fields; nested panels (hosts, tickets) save independently and are not part of it.
