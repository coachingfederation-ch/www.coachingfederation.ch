# Phase 4 — Attendee operations and check-in

Run event day without RegFox: a searchable attendee desk, per-attendee tickets with QR codes, a mobile check-in screen, CSV export, staff-added guests, and automatic reminders.

## What staff get

**Attendee desk** (inside the existing event editor)
- Search box matching name or email as you type.
- Filters for ticket tier, payment state, registration state, and check-in state, alongside the existing confirmation filter.
- Row expansion shows the full registration detail including the answers to custom questions.
- A live counter reading "checked in 34 / 120 confirmed" so the door count always reconciles with the confirmed list.
- "Add attendee" for walk-ins and comped guests: name, email, language, optional tier, no payment taken. The row is flagged as staff-created and the normal confirmation email (with ticket) goes out.
- "Export CSV" downloads the authorised attendee list for that one event.

**Check-in screen** — a new mobile-first page at `/manage/events/<id>/check-in`
- Full-screen camera scanner using the phone's camera; a permission prompt with a plain-language explanation and a fallback if the camera is refused.
- Manual search by name or email for anyone who lost their code.
- A big green / amber / red result card: "Checked in", "Already checked in at 18:42", or "Cannot check in — payment pending / cancelled / refunded".
- Scanning the same code twice never creates a second attendance; it shows the original time instead.
- Each check-in records the moment and the staff member who did it.

**Attendee ticket**
- The confirmation email gains a QR code and a "View your ticket" button.
- The ticket page shows the QR code large, the event essentials, joining details, and the cancel link — openable on any phone with no login.

**Reminders** (automatic, in the attendee's own language)
- Seven days before, and again one day before, every confirmed attendee receives a reminder with the date and time, how to get there or how to join online, practical notes, their QR code, and the cancel link.
- Only confirmed, paid-or-free registrations are reminded. Cancelled, refunded and unpaid holds are skipped, and each reminder is sent at most once per attendee per stage.
- Staff can also send a reminder immediately from the event editor, and add a short "practical notes" text per event that appears in the reminder.

## Acceptance criteria mapping

| Criterion | How it is met |
| --- | --- |
| Export authorised registrations | Per-event CSV, restricted to events the caller manages |
| Search and check in on mobile | Camera scanner plus name/email search on a phone-sized page |
| Repeat check-in does not duplicate | Check-in only writes when the timestamp is still empty; the second scan reports the first |
| Unpaid / cancelled / refunded cannot check in | Eligibility is decided in the database, not the browser |
| Count reconciles | The header counter reads both numbers from the same query |

## Technical notes

**Database migration**
- `event_registrations` gains `checked_in_at timestamptz`, `checked_in_by uuid`, `check_in_token_hash text`, `created_by_staff uuid`, `reminder_7d_sent_at`, `reminder_1d_sent_at`.
- `events` gains `practical_notes text` (plus `_de/_fr/_it`, following the tier-name translation pattern).
- `tg_event_registration_guard` keeps all six new columns server-owned on the attendee path (the same list that already protects payment and refund fields) and allows event managers to set the check-in pair.
- New security-definer function `public.check_in_registration(_token_hash text, _event_id uuid)`: verifies the caller manages the event, verifies the registration is `confirmed` with `payment_status in ('not_required','paid')`, `refund_status = 'none'` and no live hold, then sets the timestamp only when it is null and returns `{outcome: 'checked_in' | 'already' | 'ineligible', ...}`. Idempotency and eligibility therefore live in one place rather than in the UI.
- Index on `(event_id, check_in_token_hash)`.

**Token**
- 32-character base64url token minted on registration, stored only as a SHA-256 hash — the same scheme as the waitlist invite and member claim tokens. Ticket page and QR encode the raw token; a lookup only ever compares hashes.
- Backfill: existing confirmed registrations get a token in the migration.

**Server code**
- `src/lib/check-in.server.ts` — token minting, hash lookup, `checkIn` wrapper over the SQL function.
- `src/lib/check-in.functions.ts` — staff `lookupTicket`, `checkInByToken`, `checkInByRegistrationId`, `undoCheckIn` (admin/editor only), all behind `requireSupabaseAuth` + `assertOrganizer`; the public ticket page reads through a rate-limited unauthenticated function keyed on the token.
- `src/lib/registrations-export.server.ts` — CSV builder reusing the formula-injection escaping from `members-export.server.ts`, scoped to one event and gated by the caller's RLS read.
- `src/lib/event-reminders.server.ts` — selects due registrations, renders and sends, marks the stage column. Idempotent per stage, batched.
- `src/routes/api/public/event-reminders.ts` — cron entry point using the existing `x-cron-token` / `isAuthorisedCronRequest` pattern, plus a `pg_cron` job at 08:00 Europe/Zurich.
- `createEventRegistrationForStaff` in `events-admin.functions.ts` writes through the trusted client with `payment_status = 'not_required'`, records `created_by_staff`, and reuses `sendRegistrationConfirmation`.

**Email**
- New template `event-reminder` (`src/lib/email-templates/event-reminder.tsx` + `-copy.ts` for EN/DE/FR/IT), registered in the registry, reusing the existing brand chrome.
- QR image is rendered server-side to a PNG data URI with the `qrcode` package (pure JS, worker-safe) and inlined into both the confirmation and reminder templates.

**Front end**
- `src/components/cms/EventAttendeeToolbar.tsx` — search + filters, extracted from the growing `EventEditorSections.tsx`.
- `src/components/cms/StaffRegistrationDialog.tsx` — add-attendee form.
- `src/routes/_staff/manage.events.$id.check-in.tsx` — the scanner page; `BarcodeDetector` where the browser supports it, `jsqr` as fallback, `getUserMedia` with `facingMode: 'environment'`.
- `src/routes/ticket.$token.tsx` — public ticket page, `noindex`, no login.
- New i18n keys in `cms.json` (staff strings) and `events.json` (attendee-facing strings) for all four languages.

**Dependencies:** `qrcode` (generation) and `jsqr` (scanner fallback).

## PR note

**Summary** — Adds event-day operations: attendee search/filter/export, staff-created comped registrations, per-registration QR tickets, an idempotent mobile check-in flow, and automatic 7-day/1-day reminders.

**Changes**
- UI: attendee toolbar with search and four filters, check-in counter, add-attendee dialog, mobile check-in page, public ticket page.
- Backend: check-in server functions, CSV export, reminder runner, cron route, staff registration creation, QR generation.
- Email: new localized reminder template; QR and ticket link added to the confirmation.
- Config: `pg_cron` job for reminders; two new npm dependencies.

**Backend / schema changes** — one migration: six new columns on `event_registrations`, four on `events`, an index, an updated registration guard trigger, a new `check_in_registration` security-definer function, and a token backfill.

**Testing and verification** — check-in of a free RSVP, a paid ticket, and a comped staff-created guest; repeat scan; attempted check-in of pending, cancelled and refunded rows; organizer scoped to their own event vs editor across all events; counter reconciliation against the confirmed count; CSV opens cleanly and escapes leading `=`; reminder run executed twice to confirm no duplicate sends; scanner on a real phone.

**Risks and rollback** — Reminder emails are the largest blast radius; the runner is gated per stage and skips non-confirmed rows, and the cron job can be unscheduled without a code change. Schema additions are additive and safe to leave in place if the code is reverted.

**Follow-ups / known debt** — No offline mode for the scanner (a lost signal at the door blocks check-in); no printable badge or door-list PDF; no paid-offline recording for staff-created registrations; no per-attendee reminder opt-out beyond cancelling.