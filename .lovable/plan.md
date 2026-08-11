# Cancelling a paid event booking

Today staff can flip an attendee to "cancelled" with one click. The seat is
freed, but the money stays with Stripe and nobody is told. This adds a proper
cancellation flow for paid bookings: a confirmation dialog, an automatic full
refund inside the deadline, and a localized cancellation email.

## Decisions

- Only staff cancel a paid booking. Attendees keep the self-service cancel for
  free RSVPs only; on a paid seat the public panel points them to the organiser.
- Cancelling a paid, settled booking issues an automatic **full refund** when it
  happens **more than 48 hours before the event starts**. Inside 48 hours the
  seat is cancelled without a refund, and the dialog says so before staff
  confirm.
- Staff can still force a refund inside the 48-hour window from the same dialog
  (an explicit override checkbox) — the chapter needs a way to be generous.
- The attendee gets a cancellation email in their own language; a copy goes to
  office@coachingfederation.ch.

## Flow

```text
Staff presses Cancel on a paid attendee
  -> dialog: attendee, tier, amount, refund verdict (full refund / no refund,
     outside or inside the 48h window), override checkbox when inside
  -> confirm
  -> registration set to cancelled, seat freed
  -> refund requested at Stripe (full amount) when applicable
  -> cancellation email to attendee + chapter copy
  -> row shows refund state: refunded / not refunded / refund failed
```

Free RSVPs keep the current one-click cancel, but also get the confirmation
dialog (no refund wording) so no cancellation is a slip of the mouse.
Re-instating a cancelled attendee stays available and never re-charges; a
refunded seat cannot be re-instated (staff re-register the attendee instead).

## Failure handling

A failed refund never blocks the cancellation: the seat is released, the row
records the error, and the dialog offers "Retry refund". The cancellation email
states the refund is being processed only when the refund actually succeeded;
otherwise it says the chapter will be in touch about the refund. Refunds are
idempotent — a retry on an already refunded booking is a no-op.

## Technical notes

Database (one migration):
- `event_registrations`: add `payment_environment` (sandbox/live, written when
  the checkout session is created), `refund_status`
  (`none|not_applicable|pending|refunded|failed`), `refund_amount_cents`,
  `stripe_refund_id`, `refunded_at`, `refund_error`, plus
  `cancellation_status` / `cancellation_sent_at` / `cancellation_error` mirroring
  the existing confirmation columns.
- Column-scoped grants for the new attendee-visible columns; the Stripe refund
  id stays out of the authenticated grant, like `stripe_session_id`.
- `tg_event_registration_guard` keeps refund and payment columns server-owned:
  only the service-role path may write them.

Server:
- `src/lib/refunds.server.ts` — resolves the payment intent from the stored
  checkout session through the existing gateway client in `stripe.server.ts`,
  creates a full refund with an idempotency key of
  `refund-<registration_id>`, and records the outcome.
- `src/lib/event-cancellation.server.ts` — mirrors
  `event-confirmation.server.ts`: claim-then-send, localized copy, chapter copy,
  status written back on the row.
- New template `src/lib/email-templates/event-cancellation.tsx` reusing the
  chrome of the registration confirmation, with a `METHOD:CANCEL` calendar link
  so the entry disappears from the attendee's calendar.
- `cancelRegistration` server fn in `events-admin.functions.ts` (staff-guarded)
  replaces the paid path of `setRegistrationStatus`; takes
  `{ registrationId, refund: boolean }` and returns the refund outcome.
- `releaseCheckoutSession` (abandoned checkout) is untouched — nothing was
  captured there.

UI:
- `EventEditorSections.tsx`: cancel button opens an `AlertDialog` with the
  refund verdict, override checkbox and the resulting state; attendee table
  gains a refund column next to the confirmation-email column.
- Public `EventRegistrationPanel.tsx`: for a paid confirmed seat, replace the
  self-cancel button with a short "contact the organiser to cancel" note.
- All new strings localized in EN, DE, FR, IT (`cms.json` for staff, the email
  copy map for attendees).

## PR note

**Summary** — Adds a guarded staff cancellation flow for paid event bookings:
confirmation dialog, automatic full refund outside 48 hours, and a localized
cancellation email to the attendee with a copy to the chapter office.

**Changes**
- UI: confirmation dialog on attendee cancel, refund column in the attendee
  table, paid seats no longer self-cancellable on the public event page.
- Backend: refund helper against the Stripe gateway, cancellation email sender
  and template, staff-only `cancelRegistration` server function.
- Config: none.

**Backend / schema changes** — one migration adding refund, cancellation-email
and payment-environment columns to `event_registrations`, with grants and an
updated registration guard trigger.

**Testing & verification** — free RSVP cancel, paid cancel outside 48h (refund
issued), paid cancel inside 48h (no refund), inside 48h with override, a forced
refund failure (row records the error, seat still released), repeated cancel
(idempotent), and email rendering in all four languages.

**Risks & rollback** — refunds move real money; the 48-hour rule and the
override are the guardrails, and every refund is keyed so a retry cannot double
refund. Reverting the code is safe; the added columns can stay.

**Follow-ups / known debt** — partial refunds, attendee-initiated cancellation
requests, and a chapter-level cancellation policy page are out of scope.
