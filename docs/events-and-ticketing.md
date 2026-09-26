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

## Duplicating an event

The "Duplicate" panel at the bottom of the event editor copies one event into a
new **draft** on a date staff choose, then opens the copy.

- Copied: content, language, hero image and credit, location, online link, map,
  practical notes, hero marks, capacity, registration mode and guest/ticket
  settings, attendance threshold, certificate flag, category, community, region,
  hosts (with per-event link and blurb), speakers, ticket tiers and translations.
- Not copied: registrations, waitlist, invitations, discount codes, attendance,
  certificates, CCE application, recap, series membership, "featured", and the
  published status. The copy's owner is the staff member who made it.
- Duration is preserved: `ends_at` is the new start plus the original length.
- Slug: `<source-slug>-copy`, with `-2`, `-3`, … until free.
- Like the repeat and series panels it reads the stored row, so it is blocked
  while the editor has unsaved changes.
- Server function: `duplicateEvent` in `lib/events-admin.functions.ts`
  (organizer-guarded, writes through the caller's RLS-scoped client).

## Member credits dashboard

`/member/certificates` is the member's own continuing-education record.

- Sources: hours on certificates we issued (`event_certificates`, labelled
  "Chapter event") and entries the member records themselves
  (`member_credit_entries`, labelled "Added by me"). The two are always
  labelled; a self-declared entry is never a chapter confirmation.
- Cycle window: three years. Anchored on `members.credential_expires_on` when
  ICF sends one, otherwise on `member_credit_settings.cycle_start_on`, which
  the member sets on the page. With neither, every credit is listed and no
  totals period is implied.
- Older credits are bucketed into earlier three-year windows, collapsed.
- All reads and writes run through `lib/member-credits.functions.ts` on the
  caller's own session; both new tables are owner-scoped by RLS
  (`user_id = auth.uid()`), with no anon grant.
- The route file is `routes/_member/member.certificates.tsx`. The member home
  lives in `member.index.tsx` — as `member.tsx` it was the parent of this page
  without rendering an `<Outlet />`, so the page could never appear.

## Editor layout (lifecycle stages)

`/manage/events/$id` is organised as five lifecycle stages instead of one long
form. The Deep Blue header carries the title, the status, the preview link and
a stepper; a rail lists the panels of the current stage plus the extras
toggles; a sticky bar at the bottom holds the save state and the save button
(Cmd/Ctrl+S still works).

| Stage          | Panels                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| 1 Set up       | Details (incl. date and time), Content + translations, Hosts, Speakers, Location              |
| 2 Registration | Registration settings, Approved guests, Tickets, Discount codes, Invitations, Waitlist, Forms |
| 3 Publish      | Publish/unpublish/cancel, Repeat dates, Push update to later dates, Duplicate                 |
| 4 Run          | Attendee desk (filters, check-in, export, cancellations), CCE application                     |
| 5 After        | Recap editor                                                                                  |

A stage is a view, not a gate — nothing is locked. Conditional panels keep
their old rules (tickets only when enabled, invitations only for invite-only
events, waitlist only where seats exist, CCE and forms behind their toggles);
a stage with no panels explains what switches them on.

The opening stage comes from the event itself — draft before its date opens on
Set up, a published future event on Publish, a started event on Run, a finished
one on After — and the stage staff last used is remembered per event for the
session (`src/lib/event-editor-stages.ts`, session storage key
`cms.manage-event.stage`). The chrome lives in
`src/components/cms/EventEditorChrome.tsx`; only the event's own fields are
saved by the save bar — hosts, speakers, tickets, translations and the recap
save themselves.

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
| `components/cms/EventEditorSections.tsx`         | Form panels, attendee desk, cancel dialog          |
| `components/cms/EventEditorChrome.tsx`           | Stage header, section rail, sticky save bar        |
| `lib/event-editor-stages.ts`                     | Stage list, opening stage, per-session memory      |

## Security notes

- Payment, refund and price columns are server-owned; the registration guard
  trigger resets them on any untrusted update, and only the service role can
  set `paid`.
- `authenticated` has column-scoped SELECT on `event_registrations`;
  `stripe_session_id` and `stripe_refund_id` stay out of it.
- The webhook route is public because Stripe sends no token — the signature
  check is the boundary.

## Stripe account (own key)

Payments run on the chapter's own Stripe account, not Lovable's built-in payments.

- Server: `src/lib/stripe.server.ts` uses the `STRIPE_RESTRICTED_API_KEY` secret directly. The key's mode (`rk_live_`/`sk_live_` vs test) decides the environment; a page requesting the other mode gets a clear error.
- Browser: `STRIPE_PUBLISHABLE_KEY` in `src/lib/stripe.ts` must be the same account and mode. While empty, paid registration is disabled on event pages.
- Webhook: register `https://new.coachingfederation.ch/api/public/payments/webhook?env=live` (or `?env=sandbox` for a test key) in Stripe with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Its signing secret is stored as `STRIPE_WEBHOOK_SECRET`.
- Restricted key permissions needed: Checkout Sessions (write), Customers (write), Products (write), Prices (write), Refunds (write), PaymentIntents (read), Charges (read).
