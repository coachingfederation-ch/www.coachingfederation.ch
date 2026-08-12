# Custom forms for events (registration questions + follow-up forms)

One small form engine inside event management, used in two places: the questions asked while someone registers, and a follow-up form emailed to confirmed attendees after the event.

## What already exists

- `event_registration_fields` already stores per-event registration questions (4 types, DE/FR/IT label columns) and answers land in `event_registrations.answers` (jsonb, keyed by field key), validated server-side in `tickets.server.ts` and exported in `registrations-export.server.ts`. There is no editor UI for them yet.
- Secure single-use links already have a house pattern: mint a random token, store only its SHA-256 hash (`waitlist.server.ts`), and serve it from a public `/$token` route (`/ticket/$token`).
- Emails go through the one managed sender (`sendTemplateEmail`) with per-attendee locale and a claim-then-send status column so nothing double-sends.

The plan reuses all three rather than inventing parallel machinery.

## Data model

`event_forms` — one row per form: event, `kind` (`registration` | `follow_up`), internal admin name, `is_active`, thank-you message (EN + DE/FR/IT), optional invitation intro (EN + DE/FR/IT), timestamps. At most one active `registration` form per event (partial unique index). Many follow-up forms.

`event_form_questions` — one row per question: form, `question_key` (stable, used as the answer key), `qtype` (`short_text | long_text | single_choice | multi_choice | yes_no | rating | heading`), label + help text (EN/DE/FR/IT), `options text[]`, `rating_max` plus low/high scale labels, `is_required`, `sort_order`, and the single condition: `condition_question_id`, `condition_value`. A condition may only point at an earlier single-choice or yes/no question in the same form — checked in the editor and re-checked server-side.

`event_form_recipients` — one row per (follow-up form, registration): registration, email, locale, `token_hash`, `status` (`not_sent | sent | completed`), `sent_at`, `reminder_sent_at`, `completed_at`. Unique on (form, registration).

`event_form_responses` — one row per completed submission: form, registration, optional recipient, `answers jsonb`, `submitted_at`. Unique on (form, registration) — that is the "once per attendee" rule.

Registration answers stay exactly where they are: on `event_registrations.answers`. No second write path, so the Stripe flow is untouched.

**Migration / backward compatibility.** One migration copies every existing `event_registration_fields` row into a registration `event_forms` row plus questions, preserving `field_key` as `question_key` so answers already stored keep resolving. `tickets.server.ts`, `registrations-export.server.ts` and `event-confirmation.server.ts` switch to the new tables; the old table is dropped in the same migration. Events with no rows get no form and behave exactly as today.

**RLS.** Same shape as tiers and discount codes: staff read/write through `private.event_is_managed_by(event_id, auth.uid())`; `anon` gets nothing on any of the four tables. Public reads of an active registration form go through a narrow `*_public` view (published events only, no internal name). Follow-up access is entirely server-side via the admin client after a token-hash lookup — the plaintext token exists only in the email.

## Screens

**Event editor → "Forms" section** (new `EventFormsSection.tsx`, same visual language as the tickets and discount-code sections):

- List of the event's forms with kind, active flag, question count, and for follow-up forms the eligible / sent / completed counts.
- Create form (kind + internal name), enable/disable, delete (blocked once responses exist — disable instead).
- Question editor: structured rows with add, edit, move up/down, duplicate, remove. Per question: type, label, help text, required, options, rating scale, and a "only show when …" picker limited to earlier single-choice/yes-no questions.
- Preview: renders the real public form component read-only in a dialog, conditions live.
- Optional "copy questions from another event's follow-up form" picker.

**Results view** — `/manage/events/$id/forms/$formId`, matching the reporting page: eligible / sent / completed / response-rate tiles, a response table (attendee name, email, when, answers laid out readably), and a CSV export of that form's responses.

**Public registration** — `EventRegistrationPanel.tsx` renders the form's questions in place of today's flat field list, with the new types and conditional visibility. Hidden questions are neither shown nor validated.

**Public follow-up** — new route `/form/$token`: event title, intro, questions, submit. A used token shows the already-completed state with the thank-you message; an invalid token shows a neutral not-found page. `noindex`.

## Registration answers with Stripe

Unchanged from today's mechanics, which already handle this correctly: `submitRegistration` validates answers server-side and writes them onto the registration row **at insert**, before the Checkout session exists. Payment only flips `payment_status`; it never writes answers. An abandoned or retried checkout leaves one pending row with its answers, expiring holds release it, and the webhook creates nothing. Validation is extended to the new types (yes/no, rating range, multi-choice subset) and skips questions whose condition is unmet.

## Follow-up sending and states

Eligible = `status = 'confirmed'`, `payment_status in ('not_required','paid')`, not refunded or refund-pending, deduped by email. Staff clicks Send: for each eligible registration without a recipient row, mint a token, store its hash, send `event-follow-up-invitation` through `sendTemplateEmail` in the attendee's stored locale with idempotency key `follow-up-<recipientId>`, then mark `sent`. "Send reminder" targets only `sent` recipients past a minimum interval; individual resend is a per-row action. Submitting inserts the response and marks the recipient `completed`; the unique index makes a double submit a no-op rather than a duplicate.

## Technical notes

- New modules: `src/lib/event-forms.ts` (types, condition evaluation, shared), `event-forms.functions.ts` (staff CRUD + public submit), `event-forms.server.ts` (eligibility, tokens, sending, CSV), `email-templates/event-follow-up-invitation.tsx` plus registry entry.
- All new copy added to `events.json` and `cms.json` in EN, DE, FR and IT.
- Question labels reuse the existing per-locale column convention (`label_de/fr/it`) and the existing translate-on-save helper used for tier names.
- Documentation updated in `docs/events-and-ticketing.md`, including the v1 limitations.

## Out of scope (confirmed)

Standalone forms, drag-and-drop, templates marketplace, embeds, uploads, payments in forms, multi-page journeys, scoring, multi-condition logic, cross-event reporting.

---

## PR note

**Summary.** Adds a small event-scoped form engine: registration questions get a real editor and richer question types, and organizers can send post-event follow-up forms to confirmed attendees over secure single-use links, with results and CSV export.

**Changes.** DB: `event_forms`, `event_form_questions`, `event_form_recipients`, `event_form_responses`, public view for active registration forms, migration off `event_registration_fields`. Server: form CRUD, condition-aware answer validation, eligibility, token minting, invitation/reminder sending, response CSV. UI: Forms section and question editor in the event editor, form results page, new question types and conditional rendering in the public registration panel, `/form/$token` route. Email: one new localized template. i18n: four locales. Docs: events-and-ticketing.

**Backend / schema changes.** Four new tables with grants, RLS and touch triggers; one public view; one data migration plus drop of `event_registration_fields`. No change to `tg_event_registration_guard`, tiers, discounts, refunds or the Stripe webhook.

**Testing & verification.** Event with no form unchanged; registration form on a free RSVP and on a paid tier (abandoned, retried and webhook-completed checkout each leave exactly one answer set); conditional question hidden and not validated; follow-up send to a mixed attendee list (cancelled, refunded and pending excluded); reminder skips completed; token reuse shows the completed state; invalid token neutral; CSV matches the table; anon cannot read any new table.

**Risks & rollback.** Main risk is the migration of existing registration questions — it preserves `question_key`, so stored answers keep resolving. Reverting the code with the schema in place leaves reads pointing at a dropped table, so revert is code plus a restore migration.

**Follow-ups / known debt.** One condition per question; no partial saves; no reminder schedule (manual only); no cross-event form reporting.