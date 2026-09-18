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

## Visibility vs registration (`is_internal`)

"Members only" (`events.is_internal`) is a **registration** restriction, not a
visibility one. Every published event is readable by anyone: the single SELECT
policy on `public.events` is `status = 'published'` for `anon` and
`authenticated`, and the public subscribable ICS feed lists the same set. The
badge on the card and detail page signals who may take a seat; membership and
invitations are enforced in `submitRegistration` / `tickets.server.ts` and by
`tg_event_registration_guard`.

Consequences to keep in mind: a published members-only event's title, summary
and description are public text, so nothing internal belongs there. The online
joining link is still only shown to a registered attendee and sent by email. A
security scan that flags `is_internal` as "not enforced" is reporting this
deliberate design, not a defect. If a genuinely non-public event is ever needed,
add an explicit unlisted status rather than reusing this flag.

On the public event page the joining link appears in two places once
`getMyRegistration` returns a registration (and the event is not in person):
the hero meta row renders an accent pill instead of the plain "Online" label,
and the body renders a join card (`events.detail.joinCardTitle` /
`joinCardHint`, the hint naming the link host). Both are gated on the same
condition; visitors without a registration see the location label only.

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

## Hosts

Hosts are published directory profiles linked through `event_hosts` (ordered,
cascade-deleted with the event). There is no product limit on the number of
hosts; `MAX_EVENT_HOSTS` (30, in `lib/event-hosts.ts`) is only a guard rail on
the write path.

Each link row carries two optional per-event fields, `link_url` and `blurb`.
`link_url` replaces the `/coach/<profileId>` link on the public card (opened in
a new tab); `blurb` is a short presentation (max 400 characters) rendered under
the name. Both belong to the event, not to the coach profile, so the same coach
can be presented differently on two events.

- Editing: the **Hosts** section of the event editor
  (`components/cms/EventHostsPanel.tsx`) searches the directory, attaches and
  detaches hosts, reorders them, and edits link and presentation inline.
  Saving is immediate and independent of the event form.
- Series: host rows, including link and presentation, copy to child events when
  occurrences are generated and when the parent pushes an update.

## Speakers

Speakers are a chapter-wide library (`event_speakers`) linked to events through
`event_speaker_links` (ordered, cascade-deleted with the event). A speaker has a
name, optional short bio (max 400 characters), optional link and an optional
photo stored in the `article-images` bucket under `speakers/`; photos are served
through short-lived signed URLs.

- Editing: the **Speakers** section of the event editor
  (`components/cms/EventSpeakersPanel.tsx`) searches the library, attaches or
  detaches speakers, reorders them and creates/edits speaker records inline.
  Saving a speaker changes it on every event that uses it.
- Public: `pages/EventDetail.tsx` renders a Speakers block under the hosts,
  with the name linking to the speaker's URL when one is set.
- Series: speaker links copy to child events alongside hosts, both when
  occurrences are generated and when the parent pushes an update.
- Reads go through `lib/event-speakers.server.ts`; RLS exposes speakers and
  links of published events only. Speaker bios are not translated.

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
