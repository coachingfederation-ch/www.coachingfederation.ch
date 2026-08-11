# Discount codes for ticketed events

Add per-event discount codes that organizers manage in the event editor and
visitors apply on the public registration panel. Everything about price and
eligibility is decided on the server; the browser only names a code.

## What organizers get

A new "Discount codes" section in the event editor, next to ticket tiers,
visible only for ticketed events. Each code has:

- code text (stored uppercased, unique per event)
- type: percentage or fixed CHF amount, plus the value
- active / inactive
- optional start date, optional expiry date
- optional maximum confirmed uses
- optional restriction to specific ticket tiers
- optional member-only flag
- an internal note (never shown publicly)

The list shows live status (active, scheduled, expired, exhausted, archived)
and the confirmed use count. A code that has been used cannot be deleted —
only archived; unused codes can still be removed.

## What visitors get

On ticketed events, a small "Discount code" field appears under ticket
selection. Apply shows either the new total for the selected tier, or one
clear reason: invalid, expired, not yet active, inactive, fully used, not
valid for this ticket, or members only. The visitor can remove the code and
apply a different one; only one code per registration. Nothing about the
usage limit or internal note is exposed.

Changing the selected tier re-checks the applied code and drops it with a
message if it does not apply there.

## Pricing behaviour

- The discount applies to the selected tier only, never below CHF 0.
- Discounted total 0 finishes through the existing free-registration path
  (confirmation email, no Stripe).
- Discounted total above 0 goes through the existing Stripe Checkout flow with
  the discounted amount.
- Free tiers, undiscounted tickets and all RSVP modes are untouched.

## How a use is counted

A code is "used" by a registration that is confirmed and either free
(`not_required`) or `paid`. Pending checkouts do not count as used, but while
a 30-minute hold is alive they are counted as *held* so a limited code cannot
be oversold. An abandoned checkout expires, the hold is released, and the code
becomes available again. The webhook path is unchanged and stays idempotent —
it only flips `pending -> paid`, so a duplicate Stripe event cannot count a
second use. If the last remaining use is taken while the attendee is in
checkout, the return/settlement path reports the code as exhausted and the
seat is released before payment is captured where possible.

## Technical notes

Database migration:

- `public.event_discount_codes` — `event_id`, `code`, `discount_type`
  (`percentage` | `fixed`), `discount_value`, `is_active`, `starts_at`,
  `expires_at`, `max_uses`, `tier_ids uuid[]`, `member_only`, `is_archived`,
  `internal_note`, `created_by`, timestamps. Unique index on
  `(event_id, upper(code))`, `updated_at` trigger, GRANTs for `authenticated`
  and `service_role` (no `anon` — public validation runs through a server
  function on the trusted client), RLS mirroring the existing event-manager
  policies (`private.event_is_managed_by`, admin/editor override).
- `public.event_registrations` gains the snapshot columns
  `discount_code_id`, `discount_code_text`, `discount_type`,
  `discount_value`, `discount_amount_cents`.
- `public.tg_event_registration_guard` is extended: for `rsvp_tickets`, it
  re-reads the code row itself, re-validates window/active/tier/limit, and
  sets `amount_cents = max(0, tier price - discount)` plus the snapshot
  columns. Untrusted updates keep resetting all of them to `OLD`, as today.
  A code id that fails validation raises, so no client can inject a price.

Server code:

- `src/lib/discount-codes.ts` — client-safe types and reason codes.
- `src/lib/discount-codes.server.ts` — `resolveDiscount(eventId, code, tier,
  membership)` returning either the discounted amount or a reason; usage
  counting (confirmed + live holds); shared by validation and registration.
- `src/lib/discount-codes.functions.ts` — public `validateDiscountCode`
  (rate-limited via `checkRateLimit`, outcome-only response) and the staff
  `listEventDiscountCodes` / `saveEventDiscountCodes` / `archiveDiscountCode`
  using `context.supabase` and `assertOrganizer`, matching the tier functions.
- `src/lib/tickets.server.ts` — `RegistrationInput` gains `discountCode`;
  `submitRegistration` resolves it server-side, decides free vs paid on the
  discounted amount, writes `discount_code_id`, and passes the discounted
  amount to the Stripe line item. `finalizePaidRegistration` unchanged.
- `src/lib/events.functions.ts` — the two RSVP schemas accept an optional
  `discountCode` string.

UI:

- `src/components/cms/EventDiscountCodesSection.tsx`, rendered from
  `src/routes/_staff/manage.events.$id.tsx` right below the tickets section,
  in the same slot pattern.
- `src/components/events/EventRegistrationPanel.tsx` — code field, apply /
  remove, result line, discounted total shown on the selected tier.
- New CMS and events strings in `src/i18n/locales/{en,de,fr,it}/*.json`.

## PR note

**Summary** — Adds per-event discount codes: organizer CRUD in the event
editor, an optional code field on ticketed registrations, and server-side
price and eligibility resolution with confirmed-use limits.

**Changes** — UI: discount codes section in the event editor, code field in
the public registration panel, four-language strings. Backend: new discount
code table plus registration snapshot columns, extended registration guard
trigger, new discount server module and server functions, discounted amount
threaded through registration and Stripe Checkout.

**Backend / schema** — One migration: `event_discount_codes` (+GRANTs, RLS,
touch trigger), five snapshot columns on `event_registrations`, updated
`tg_event_registration_guard`.

**Testing & verification** — Percentage and fixed codes against a CHF 50
tier; zero-total code taking the free path; negative-total clamp; expired /
inactive / exhausted / wrong-tier / member-only rejections as guest, as
signed-in non-member and as a claim-linked member; abandoned checkout
releasing the hold and freeing the use; an undiscounted paid ticket and an
RSVP event unchanged.

**Risks & rollback** — The guard trigger is shared by every registration, so
the discount branch only runs when `discount_code_id` is set; reverting the
code leaves the new columns unused and harmless.

**Follow-ups / known debt** — Cancellation and refund do not return a use to
the pool. No per-attendee or global (cross-event) codes, no stacking, no
usage export. Exhaustion during an open checkout is caught at settlement, not
at the moment the last seat is taken by someone else.
