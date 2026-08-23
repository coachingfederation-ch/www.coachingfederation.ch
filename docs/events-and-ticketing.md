# Events, ticketing and cancellation

How an event goes from a staff row to a paid, confirmed and (if needed)
refunded seat. Companion to `events-team-communities.md`, which covers the
event content model; this document covers registration, money and email.

## Registration modes

Set per event (`events.registration_mode`), enforced both in
`submitRegistration` and by `tg_event_registration_guard`:

| Mode           | Meaning                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `none`         | No registration — the page shows the event only.                                 |
| `rsvp`         | Free RSVP, open to anyone.                                                       |
| `rsvp_members` | Members only; the `guest_registration_allowed` flag reopens it to non-members.   |
| `rsvp_tickets` | Ticket tiers apply; free tiers finish instantly, priced tiers go through Stripe. |

An event is open when the mode is not `none` and either no registration window
is set or "now" falls inside it (`events_public` view).

## Membership and pricing

`resolveMembership` (`src/lib/tickets.server.ts`) is the only authority:

- A signed-in visitor is a member when `members.auth_user_id` links to a record
  with `activity_state = 'active'`. Email equality is never used.
- Anyone may instead type their ICF member number, checked against the same
  active-record rule. That path is rate limited (5 / 5 min, 30 / day per
  IP or user) and answers only "confirmed or not".
- The client only ever names a tier id; `resolveChargedTier` re-derives the
  segment, price and currency from `event_ticket_tiers`, and the database
  trigger overwrites `amount_cents` / `currency` from the tier row on insert.

Tier names and descriptions are translated to DE/FR/IT on save
(`tier-translations.functions.ts`) and stay editable afterwards.

## Discount codes

Organizers manage codes per event in the editor (`EventDiscountCodesSection`).
A code carries a type (`percentage` or `fixed` CHF), a value, an active flag,
optional start/expiry dates, an optional maximum number of uses, optional
applicable tiers, an optional members-only flag and an internal note that is
never exposed publicly. A code that has already been used is archived instead
of deleted.

On the public panel the field appears only for a priced tier. Applying it calls
`validateDiscountCode` (guest, rate limited) or `validateDiscountCodeAsMember`
(signed in) and shows the new total or a stable reason. Changing the tier or
the membership evidence drops the code, and only one code applies per
registration.

Price resolution happens three times and always server-side: the validation
endpoint for the preview, `submitRegistration` for the Stripe amount, and
`tg_event_registration_guard`, which recomputes the discount from the stored
code before the row is accepted and writes the snapshot
(`discount_code_text`, `discount_type`, `discount_value`,
`discount_amount_cents`). A discount can never take a price below zero, and a
ticket reduced to zero finishes on the free path without Stripe.

A use counts as a confirmed registration (free, or paid after settlement) plus
live 30-minute checkout holds, so a limited code cannot be oversold while
someone pays and an abandoned checkout consumes nothing. Known limitation: a
use is **not** returned after a cancellation or refund.

## Registration flow

```text
submitRegistration
  -> release expired holds (30 min) for the event
  -> resolve mode, membership, tier, custom answers
  -> insert event_registrations (id generated server-side; guests are insert-only)
  free  -> confirmation email, done
  paid  -> payment_status=pending, hold_expires_at=+30 min
        -> Stripe product (tax_code txcd_10000000) + embedded Checkout session
        -> store stripe_session_id + payment_environment (sandbox|live)
        -> PaymentOverlay renders the session in a modal
```

Settlement has two idempotent paths that run the same `pending -> paid`
update: the Stripe webhook at `/api/public/payments/webhook?env=…` (signature
verified; authority) and `confirmCheckoutSession`, used when the visitor
returns before the webhook lands. Expired or failed sessions release the seat.

## Confirmation email

`event-confirmation.server.ts` sends in the attendee's stored `locale`, with a
claim-then-send guard (`confirmation_status`: `not_sent | sending | sent |
failed`) so no double sends. It carries event details, tier, payment reference,
a hosted `.ics` link (`/api/public/calendar/$file`) and a Google Calendar link.
Failures are recorded on the row, never thrown at the registrant. Staff can
re-send from the attendee table, which bumps the calendar `SEQUENCE`.

## Cancellation and refunds

Only staff cancel a paid seat. Attendees keep self-cancel for free RSVPs;
`cancelMyRegistration` rejects a paid seat with `PAID_CANCEL_REQUIRES_STAFF`
and the public panel points them to the organiser.

`cancelRegistration` (staff-guarded, `events-admin.functions.ts`):

```text
confirm dialog (attendee, tier, amount, refund verdict, override checkbox)
  -> status = cancelled, seat freed
  -> refund decision: full refund when > REFUND_DEADLINE_HOURS (48) before start,
     otherwise refund_status = declined; staff may override either way
  -> refundRegistration() when refunding
  -> cancellation email to attendee + copy to office@coachingfederation.ch
```

`refunds.server.ts` resolves the payment intent from the stored checkout
session, refunds the full amount in the environment recorded on the row, and
uses the idempotency key `refund-<registrationId>` so a retry or a double click
can never refund twice. It never throws: the outcome lands in `refund_status`
(`none | not_applicable | pending | refunded | declined | failed`),
`refund_amount_cents`, `stripe_refund_id`, `refunded_at`, `refund_error`. A
failed refund leaves the seat released and offers "Retry refund"
(`retryRegistrationRefund`), which does not re-send the email.

The cancellation notice states a refund is on its way only when the refund
actually succeeded; otherwise it says the chapter will be in touch.

## Where things live

| Module                                           | Responsibility                                     |
| ------------------------------------------------ | -------------------------------------------------- |
| `tickets.ts` / `tickets.functions.ts`            | Client-safe types, public read endpoints           |
| `tickets.server.ts`                              | Membership, pricing, holds, registration, checkout |
| `refunds.server.ts`                              | Stripe refunds, idempotent, outcome written to row |
| `event-confirmation.server.ts`                   | Confirmation email + shared formatting helpers     |
| `event-cancellation.server.ts`                   | Cancellation notice + chapter copy                 |
| `event-calendar.ts`, `api/public/calendar.$file` | RFC 5545 `.ics` generation and hosting             |
| `events-admin.functions.ts`                      | Staff: tiers, attendee list, cancel, retry refund  |
| `components/events/EventRegistrationPanel.tsx`   | Public registration + member price unlock          |
| `components/events/PaymentOverlay.tsx`           | Embedded Checkout modal, resume-payment state      |
| `components/cms/EventEditorSections.tsx`         | Tier editor, attendee table, cancel dialog         |

## Security notes

- Payment, refund and price columns are server-owned; the registration guard
  trigger resets them on any untrusted update, and only the service role can
  set `paid`.
- `authenticated` has column-scoped SELECT on `event_registrations`;
  `stripe_session_id` and `stripe_refund_id` stay out of it.
- The webhook route is public because Stripe sends no token — the signature
  check is the boundary.
