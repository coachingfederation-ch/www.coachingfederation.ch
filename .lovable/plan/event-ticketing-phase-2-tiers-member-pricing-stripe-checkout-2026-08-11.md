# Event ticketing — Phase 2: tiers, member pricing, Stripe Checkout

Extends the existing event registration path (capacity, window and duplicate guards live in the `tg_event_registration_guard` trigger; public reads go through `events_public`). No parallel flow: tier selection and payment become extra steps on the registration the site already has.

## Data model

**`event_ticket_tiers`** — one row per tier: event, name + description (EN/DE/FR/IT columns, matching the vocabulary tables), `price_cents` (0 = free), currency fixed to CHF, optional `capacity`, `segment` (`member` | `non_member` | `general`), `is_active`, `sort_order`. At most one active member tier and one active non-member tier per event (partial unique indexes).

**`event_registration_fields`** — organizer-defined questions per event: label (4 locales), type (short text / long text / single choice / checkbox), options, required flag, sort order, active flag. Answers are stored on the registration as validated JSON.

**`event_registrations`** gains `tier_id`, `payment_status` (`not_required` | `pending` | `paid` | `expired`), `amount_cents`, `currency`, `stripe_session_id` (unique), `hold_expires_at`, `answers` jsonb. Existing rows default to `not_required`, so RSVP-only events are untouched.

**Seat accounting.** A tier seat is taken by a confirmed registration that is either free/RSVP, paid, or pending with a live hold. The guard trigger is extended to lock the tier row (`SELECT … FOR UPDATE`) and re-count inside the same transaction, so two people racing for the last seat cannot both win. Event-level capacity keeps working alongside per-tier capacity.

**Public exposure.** A new `event_ticket_tiers_public` view exposes active tiers on published events only, with computed `seats_remaining` / `is_sold_out` — never raw registration rows.

## Membership verification (server-side only)

Resolved in a server function at the moment of registration, never trusted from the client:

1. The signed-in user's `members` row via `auth_user_id` (never email), with `activity_state = 'active'` and `membership_expiration_date` today or later (or unset).
2. Fallback for a signed-in user who has not claimed their account yet: they may enter their ICF member ID (`cst_recno`), checked against an active, unexpired member record. This grants member pricing for that registration only — it does not link or claim the account — and it goes through `checkRateLimit` to stop enumeration.

If neither confirms, the non-member price applies. Requesting the member tier without confirmation is rejected server-side.

## Payment

Stripe via Lovable's built-in payments (sandbox already connected). A shared `src/lib/stripe.server.ts` gateway client is added; secrets stay server-side. Tier amounts are arbitrary per event, so Checkout uses inline `price_data` in CHF rather than a synced catalogue, with `ui_mode: "embedded_page"`, a 30-minute session expiry, and Stripe handling tax, fraud, disputes and transaction support end to end (+3.5% per transaction; buyer statements read `LINK.COM* …`).

Flow: the server creates the registration as `pending` with a 30-minute hold, then creates the Checkout session from the stored tier price. The client never sends an amount.

**Confirmation** happens in a webhook route at `src/routes/api/public/stripe-webhook.ts`: signature verified against the webhook secret, then `checkout.session.completed` flips the registration to `paid`. Finalisation is keyed on `stripe_session_id` and only transitions `pending → paid`, so a replayed event changes nothing. `checkout.session.expired` (and any expired hold, swept lazily on the next read) releases the seat. The return page also reconciles once by session id, so a slow webhook never leaves the attendee staring at a pending screen.

## Public event page

- Tier list showing name, description, price (or "Free"), and per-tier availability. Sold-out tiers stay visible, disabled and labelled.
- Active member signed in: the member tier is preselected, with a line explaining the member price applies and what it saves against the non-member price.
- Signed out: non-member price is the default, plus "members pay less" with a sign-in link that returns to the same event; form state is kept in session storage so nothing typed is lost.
- Signed in without an active membership: non-member price, with a plain explanation and the member-ID entry as an option.
- Custom fields render below name/email/notes and are validated server-side.
- Free tier submits straight through, no Stripe.

## Organizer editor

A "Tickets" section in the existing event editor: create, edit, reorder, activate/deactivate tiers, set price and capacity, mark member and non-member tiers, and see sold counts per tier. A "Registration questions" section manages custom fields. The registrations list splits into pending, paid and free.

## Copy

Every new string added to `events.json` in EN, DE, FR and IT.

---

## PR note

**Summary.** Adds paid and free ticket tiers to events, with server-verified member pricing, Stripe Checkout for paid tiers, and organizer-managed tiers and registration questions. RSVP-only events keep their current behaviour.

**Changes.** DB: `event_ticket_tiers`, `event_registration_fields`, new columns on `event_registrations`, extended registration guard, public tier view. Server: membership resolution, tier-aware registration, Stripe client, checkout creation, webhook finalisation, hold expiry. UI: tier selector, member-pricing panel and custom fields on the event page; Tickets and Questions sections in the editor; four-locale copy.

**Backend / schema changes.** Two new tables, one new view, additive columns and indexes on `event_registrations`, a rewritten guard trigger, RLS plus column-scoped grants for the new tables, and one new public webhook route.

**Testing & verification.** Free-tier registration end to end; paid-tier checkout in Stripe test mode with card 4242…; replayed webhook leaves state unchanged; concurrent last-seat submissions; member, non-member and signed-out pricing; tampered tier/price request rejected; an existing RSVP event unchanged.

**Risks & rollback.** Blast radius is the event registration path. Schema changes are additive, so reverting the code leaves the database safe. The guard trigger is the one in-place change and the main regression risk for existing RSVP events — covered explicitly in testing.

**Follow-ups / known debt.** No refunds, cancellations, coupons, waitlists, check-in or exports; hold expiry is swept lazily on read rather than by a scheduled job.