# Event creation wizard

Creating an event today means facing one long page with every field at once — location, tickets, CCE, repeat, forms — whether they apply or not. This plan adds a short guided wizard for new events and makes the existing editor hide what the wizard says is irrelevant.

## The flow

Five steps, each one screen, with a progress rail and back/next.

```text
1 Basics     Title · date & time · language · category · region
2 Where      In-person / Online / Hybrid  -> only the matching fields
3 Who        Nobody registers / Open RSVP / Members only / Invited / Tickets
4 Extras     Repeats? · CCE credits? · Custom questions? (yes/no toggles)
5 Content    Summary · description (AI draft from steps 1-4) · hero image
   Review    Save as draft  |  Publish now
```

Rules that make it short:
- Step 2 shows venue + city + map for in-person, the meeting link for online, both for hybrid. Nothing else.
- Step 3 asks capacity only when registration is on, and ticket tiers only for the ticketed answer.
- Step 4 collects yes/no answers only. The detail panels (repeat dates, CCE application, form builder) stay in the editor — the answers decide which of them appear there.
- Step 5 offers an "AI draft" button that writes summary and description from the title, date, location and audience already chosen, using the same assistant already wired into the editor. The hero image can be skipped.
- Every step can be skipped forward except title and start date; anything unanswered simply keeps its current default.

## Editor after the wizard

The existing editor keeps all its sections but becomes answer-driven:
- Sections the answers rule out are hidden (no online link on an in-person event, no tickets on an RSVP event, no CCE panel unless CCE was chosen, no repeat panel unless the event repeats).
- The wizard answers stay editable in the editor, so turning CCE on later reveals the panel again.
- Attendees, discount codes, waitlist, invitations and forms keep behaving exactly as they do now, including the existing rule that repeat dates only unlock on a published, saved event.

## Technical notes

- New route `src/routes/_staff/manage.events.new.tsx` holding the wizard; the "New event" button on `manage.events.index.tsx` points there instead of calling `createEvent` immediately.
- The wizard keeps state in React and calls `createEvent` once, at the review step, then `setEventStatus` when the user chooses "Publish now". No new tables and no schema change — `location_mode`, `registration_mode`, `cce_enabled` and `recurrence` already exist on `events`.
- Steps render as small components in `src/components/cms/event-wizard/`, reusing the field groups from `EventEditorSections.tsx` where the markup is identical, so there is one source of truth per field.
- Visibility in the editor is derived from the stored row (`location_mode`, `registration_mode`, `cce_enabled`), not from a new "wizard completed" flag, so existing events behave sensibly on first open.
- All controls come from the ICF design system (`Button`, `Input`, `Select`, `Checkbox`, `Card`, `Badge`); the progress rail uses existing tokens, no new colours.
- New copy goes into `src/i18n/locales/{en,de,fr,it}/cms.json` under `events.wizard`.
- The AI draft reuses the existing event writing-assistant server function; no new model wiring.

## PR note

**Summary** — Adds a five-step creation wizard for events and makes the event editor hide sections the event's own settings rule out, so staff answer a few questions instead of scanning one long form.

**Changes**
- UI: new `/manage/events/new` wizard route, step components under `src/components/cms/event-wizard/`, "New event" button retargeted, conditional section rendering in `manage.events.$id.tsx`.
- Copy: `events.wizard` keys in four locales.
- Server: none beyond reusing `createEvent`, `setEventStatus`, `updateEvent` and the existing AI drafting function.

**Backend / schema changes** — None.

**Testing & verification** — Create an in-person ticketed event and an online RSVP event through the wizard; confirm the editor then shows only the matching panels; open an event created before this change and confirm nothing is lost; check draft vs publish-now paths; verify the repeat panel still requires a published, saved event.

**Risks & rollback** — Blast radius is the staff event area only. Reverting the two route files restores today's behaviour; no data migration to undo.

**Follow-ups / known debt** — Editing an existing event still happens in the long editor; a "re-run the wizard" entry point is deliberately out of scope.
