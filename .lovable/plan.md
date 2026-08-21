# Add to calendar on event pages

Visitors can add any published event to their own calendar — Google, Apple, and Microsoft — straight from the event page, without registering.

## What the visitor sees

An "Add to calendar" button in the event detail meta area (next to the existing share controls). Opening it shows four options:

- Google Calendar — opens the Google template link in a new tab
- Apple Calendar / iCal — downloads an `.ics` file
- Outlook.com — opens the Outlook web compose link
- Office 365 — opens the Microsoft 365 compose link

The same control appears in the registration panel once a place is confirmed, so an attendee gets the invite immediately after signing up.

Times always use the event's own timezone, the entry carries title, description, location (venue or online link) and the event URL. Labels are localized in DE, FR, IT, EN.

## Technical notes

- `src/lib/event-calendar.ts`: add `outlookCalendarUrl()` and `office365CalendarUrl()` builders (`outlook.live.com` / `outlook.office.com` `deeplink/compose` with `startdt`/`enddt` in UTC ISO), plus a small helper that turns a public event row into the shared calendar payload. Reuse the existing `buildEventIcs` and `googleCalendarUrl`.
- New public route `src/routes/api/public/event-calendar.$file.ts` serving `/<event-id>.ics` for a **published** event only, read through `events_public` with the server publishable client. No attendee data is involved; the existing registration `.ics` route stays untouched.
- New component `src/components/events/AddToCalendarMenu.tsx` built from the design system's `DropdownMenu` + `Button`, taking the event row and rendering the four links. Used by `src/pages/EventDetail.tsx` and `src/components/events/EventRegistrationPanel.tsx`.
- i18n: new `events.detail.calendar.*` keys in all four locale files.
- Confirmation email (`event-registration-confirmation.tsx`) gains the Outlook link next to the existing Google and `.ics` links.

## PR note

**Summary** — Adds an "Add to calendar" control (Google, Apple/ICS, Outlook.com, Office 365) to the public event page, the registration panel, and the confirmation email.

**Changes**
- UI: `AddToCalendarMenu` component, wired into event detail and registration panel; localized strings in DE/FR/IT/EN.
- Lib: Outlook/Office 365 URL builders and a shared event→calendar payload helper in `event-calendar.ts`.
- Route: public per-event `.ics` endpoint restricted to published events.
- Email: extra Outlook link in the confirmation template.

**Backend / Schema Changes** — None.

**Testing & Verification** — Event page as anonymous visitor and as a registered attendee; a published event with venue, one online-only, one hybrid; `.ics` opens correctly in Apple Calendar; draft event id returns 404 on the new endpoint; times verified across a DST boundary.

**Risks & Rollback** — Additive and presentation-only; revert the component, route, and lib additions to roll back.

**Follow-ups** — No "add to calendar" in the reminder emails yet; can follow if wanted.
