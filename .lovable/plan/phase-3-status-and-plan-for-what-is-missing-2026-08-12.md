# Phase 3 status and plan for what is missing

## What is already built

**Discount codes — complete.**
- Event-level codes with fixed CHF or percentage value, active/inactive, archive, validity window, max uses, ticket-tier eligibility, member-only restriction, one code per registration.
- Staff CRUD in the event editor, including auto-suggested codes derived from the event title and amount.
- Server-side re-validation in the database trigger: the code is re-checked and the price recomputed on every insert, clamped so the total can never go below CHF 0, with the discount snapshot stored on the registration for audit.
- Usage limits count confirmed uses plus live 30-minute checkout holds, so a limited code cannot be oversold.
- A 100% discount skips Stripe and creates a confirmed free registration.

Acceptance criteria 1, 2 and 3 are met.

**Cancellations and refunds — mostly built.**
- Attendee self-cancellation for free/RSVP seats (signed-in attendees).
- Organizer cancellation with a confirmation dialog, refund verdict preview and staff override.
- 48-hour refund policy, Stripe refund initiation, refund state on the registration (`none`/`refunded`/`declined`/`failed`), refund retry, and localized cancellation emails with a copy to the chapter office.
- Cancelled seats stop holding capacity, so cancellation frees seats.

Acceptance criteria 5 and 6 are met (6 with a gap: there is no free-text note field).

**Waitlists — not built at all.** Nothing in the schema, server or UI.

## What is missing

1. Waitlists (the whole feature).
2. Cancellation / refund notes: staff can cancel and refund, but cannot record *why*. Only a machine error string is stored.
3. Guest self-cancellation: attendees who registered without an account have no cancellation path at all; they must email the office.

## Plan for the missing work

### 1. Waitlists

Data: a new `event_waitlist_entries` table holding event, optional tier, name, email, optional user link, locale, status (`waiting`, `invited`, `converted`, `expired`, `withdrawn`), invite token hash, invite sent/expiry timestamps, and position. Row-level security: organizers of the event manage entries; guests may insert only when the event or tier is actually full; nobody may read the list publicly.

Public side: when an event or the selected tier is sold out, the registration panel swaps the register button for a "Join the waitlist" form (name, email, tier). Confirmation is outcome-neutral and localized. A waitlist entry is explicitly not a registration and never holds a seat.

Organizer side: a waitlist section in the event editor listing entries in order, with counts per tier, and an "Invite" action. Inviting sends a localized email with a tokenized link and starts an expiry window (default 72 hours, configurable per invite). Staff can withdraw an entry or re-invite an expired one.

Invitee flow: the tokenized link opens the normal registration panel with the tier pre-selected and a reserved seat that ignores sold-out state until the invite expires. Completing registration (free or paid, discount codes still apply) marks the entry `converted`. Expiry is enforced server-side on use, and a scheduled sweep marks lapsed invites `expired` so the next person can be invited.

### 2. Cancellation and refund notes

Add a `cancellation_note` column to registrations, written only by staff. The cancel dialog gains an optional note field; the note is shown in the attendee detail panel and in the staff-facing record. It is never sent to the attendee.

### 3. Guest self-cancellation

Give each confirmation email a tokenized "cancel this registration" link. The token opens a small public page showing the event and seat; for a free seat it cancels immediately, for a paid seat it records a cancellation request and notifies the office rather than refunding automatically — matching the existing rule that money decisions stay with staff.

## PR note

**Summary** — Completes Phase 3 by adding waitlists, staff cancellation notes, and a guest self-cancellation path; discounts and staff cancellations/refunds are already in place.

**Changes**
- UI: waitlist join form on sold-out events, waitlist management section in the event editor, note field in the cancel dialog, public token-based cancel page.
- Backend/schema: new `event_waitlist_entries` table with grants and policies, `cancellation_note` column on registrations, invite/expiry server functions, tokenized cancel + waitlist-invite server functions, localized invite and waitlist-confirmation email templates.
- Config: none.

**Backend / schema changes** — one migration creating the waitlist table (with GRANTs before RLS and policies), adding `cancellation_note`, and adding indexes on event/tier/status.

**Testing & verification** — sold-out free event and sold-out paid tier; join waitlist as guest and as signed-in member; invite, convert, let expire, re-invite; discount code applied through an invite; staff cancel with note; guest cancel link for free and for paid seat; verify a waitlist entry never consumes capacity.

**Risks & rollback** — additive only; existing registration and discount paths are untouched apart from the sold-out branch in the registration panel. Reverting the code leaves the new table unused and harmless.

**Follow-ups / known debt** — automatic promotion (invite the next person the moment a seat frees) is deliberately manual for now; waitlist analytics and CSV export are not included.
