# Attendee confirmation emails for event registrations and ticket purchases

Confirmation email in the attendee's own language for both free registrations and confirmed ticket purchases, with a one-click calendar entry. Built on the existing transactional email path — no second provider, no parallel send.

## What you asked about up front

**Calendar attachment.** Lovable's managed email service has no attachment field — an `.ics` cannot be attached to the message. Instead each email carries an **Add to calendar** button pointing at a stable, public `.ics` URL for that registration, plus an **Add to Google Calendar** link for one-click on mobile. The `.ics` is generated on request by a public route, downloads with the right MIME type, and opens in Apple Calendar, Google Calendar and Outlook exactly as an attachment would. Same stable `UID` per event + registration, so a re-send updates the existing entry rather than duplicating it.

**Email function.** The existing send helper is extended, not replaced: it gains optional per-locale subject and template resolution. Nothing about the member claim invitation email changes.

**Data model.** Two additive things on `event_registrations`: the locale captured at registration time, and the confirmation send state (not sent / sent / failed, with timestamp and last error).

**Triggers.** Free registration: at the end of the existing server-side submit, after the row is written. Paid registration: inside the same idempotent `pending -> paid` transition the Stripe webhook already runs — never at checkout redirect.

## Data model

Additive columns on `event_registrations`:

- `locale` — `en` | `de` | `fr` | `it`, captured when the registration is created, defaulting to the site default when absent. Needed because the paid email is sent later by the webhook with no user session.
- `confirmation_status` — `not_sent` | `sent` | `failed`
- `confirmation_sent_at`, `confirmation_error`

Send state is written in the same path that confirms the registration, so it doubles as the idempotency record: the send is attempted only when the status is still `not_sent`, claimed with a conditional update before the provider call. A replayed webhook finds the row already claimed and sends nothing.

No new tables. No queue.

## Email content

One template rendered per locale, used for both cases, with a paid block that appears only when payment was taken:

- Subject and opening line confirm the registration, in the attendee's language.
- Event title, date, time, timezone and location — from the Phase 2.5 `event_translations` row for that locale, falling back field by field to the source language, using the same overlay rule the public event page already uses.
- Link back to the public event page in the attendee's locale.
- The ticket tier they registered on (localised tier name).
- Their answers to the event's custom registration questions, with localised labels.
- Add to calendar and Add to Google Calendar.
- Organizer contact for questions.

Paid emails add: amount and currency formatted for the locale, confirmation that payment was received with a payment reference, and whether the member or non-member price applied.

Plain, readable, consistent with the transactional mail the site already sends. Rendered to both HTML and plain text.

## Calendar entry

A public route serves `/api/public/events/{registrationId}/calendar.ics`, keyed on the registration id so nothing about the attendee is exposed beyond what they themselves submitted.

- `DTSTART`/`DTEND` carry the event's own timezone explicitly (a `VTIMEZONE` block plus TZID-qualified local times), so an attendee in another timezone sees the correct local time rather than a shifted one.
- Title, description and location in the attendee's locale, with the same translation fallback as the email body.
- The public event page URL is included in the entry.
- Stable `UID` per event + registration; `SEQUENCE` increments on re-send so calendars update the existing entry.
- Online events use the join URL as the location; an event with no location omits the field rather than emitting an empty one. Multi-day events emit their real end time.

A calendar-generation failure never blocks the email: the button is omitted and the confirmation still goes out.

## Failure handling and re-send

- A send failure never rolls back or blocks a confirmed registration or a completed payment. It records `failed` plus the error and returns.
- The event editor's attendee list gains a confirmation column (sent / failed / not sent, with timestamp) and a **Re-send** action per registration, restricted to the event's managers. Re-sending clears the failure and re-attempts.

## Copy

Every string in the templates and the calendar entry exists in `events.json` for EN, DE, FR and IT. No machine translation at send time, no English leaking into a localised email. Dates, times and amounts are formatted for the recipient's locale.

## Technical notes

- `src/lib/tickets.server.ts`: `submitRegistration` stores `locale`; the free path triggers the send after the insert succeeds. `finalizePaidRegistration` sends only when its own conditional `pending -> paid` update actually changed a row.
- New `src/lib/event-confirmation.server.ts` assembles the localised event, tier, answers and payment facts, and claims/records send state.
- New `src/lib/event-calendar.ts` builds the ICS text as a pure function.
- New template under `src/lib/email-templates/`, registered in `registry.ts`; the send helper gains locale-aware subject resolution.
- Attendee confirmations send in both TEST and LIVE integration modes, per your answer — they are unrelated to the member-sync email suppression gate.

## PR note

**Summary.** Sends a localised confirmation email with a calendar entry when a free registration is completed or a paid registration is confirmed by the Stripe webhook.

**Changes.** DB: `locale` and confirmation send-state columns on `event_registrations`. Server: confirmation assembly and send-state claiming, ICS builder, public ICS route, locale capture in `submitRegistration`, send hook in paid finalisation. UI: confirmation status column and re-send action in the event editor attendee list. Copy: four-locale strings.

**Backend / schema changes.** Additive columns plus grant updates for them; one new public route serving `.ics`.

**Testing & verification.** Free registration in each of EN/DE/FR/IT; paid checkout in Stripe test mode; webhook replayed twice with no second email; abandoned checkout sends nothing; event with no translation, no tier, no location, online, and spanning multiple days; forced send failure leaves the registration confirmed and visible as failed; re-send updates the calendar entry rather than duplicating it; existing member claim email unchanged.

**Risks & rollback.** Blast radius is the registration confirmation path. Columns are additive, so reverting the code leaves the database safe. The one in-place change is the paid finalisation, which keeps its existing conditional-update semantics.

**Follow-ups / known debt.** Failed sends are retried manually rather than by a scheduled sweep. No reminders, cancellations, refunds, organizer notifications or PDF invoices.