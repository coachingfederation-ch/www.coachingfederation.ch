# Automatic post-event feedback

## What exists today

- Follow-up forms can be built per event, translated, and sent — but only when staff press "Send" in the form editor. There is no automatic send.
- The feedback page attendees land on (`/form/<token>`, single-use link, one token per attendee) is fully built, as is the invitation email and the results/CSV view.
- Reminders exist as a manual button only.
- The scheduled-jobs table currently has no job for event mail runs at all — even the existing attendee reminder endpoint is never called on a schedule. That is why nothing has ever gone out by itself.

## What we build

1. **Automatic invitation ~15 minutes after the event ends.** A scheduled run every 10 minutes looks for events whose end time (or the two-hour fallback for events without one) passed at least 15 minutes ago, that are published, not cancelled, and have an active follow-up form that has not been auto-sent yet. It then sends the existing invitation email to every confirmed attendee with an email address — exactly the same send path staff trigger manually, so links, locales, and single-use tokens behave identically.
2. **One automatic reminder after three days.** Same run picks up recipients who were invited three or more days ago and have not answered. People who completed the form, cancelled, or bounced are never touched. One reminder per person, ever.
3. **Link-only email.** No in-email answering; the email carries the personal link to the feedback page, as it does now.
4. **Staff stay in control.** The follow-up form panel gains a small status line — "Sends automatically 15 minutes after the event" / "Sent automatically on <date>" — plus a switch to turn automatic sending off for that form. The manual Send and Remind buttons keep working, and a manual send simply marks the form as already handled so nobody gets two invitations.

## Technical notes

- Schema: add `auto_send` (boolean, default true), `auto_sent_at`, and `auto_reminder_at` to `event_forms`; a migration with the usual grants. `event_form_recipients` already carries `sent_at`, `reminder_sent_at`, `completed_at` and `status`, which is enough to drive the reminder pass.
- New scheduled endpoint `src/routes/api/public/event-follow-ups.ts`, authorised with the same server-only cron token as the other jobs (`isAuthorisedCronRequest`), delegating to a new `runFollowUpSends()` in `src/lib/event-forms.server.ts` that reuses `sendFollowUp(formId, "invite" | "reminder")`.
- `pg_cron` job every 10 minutes calling that endpoint; while we are there, also schedule the existing `event-reminders` endpoint hourly, since it is currently dormant.
- Idempotency: `auto_sent_at` / `auto_reminder_at` guard the form level, the per-recipient row guards the person level, and the email helper's idempotency key guards the send itself. A repeated cron tick cannot double-send.
- New i18n keys for the panel status line and the auto-send switch in EN, DE, FR, IT.

## PR note

- **Summary:** Post-event feedback forms are sent automatically ~15 minutes after an event ends, with one automatic reminder after three days; staff can opt a form out.
- **Changes:** UI — auto-send switch and status line in the follow-up form panel, four locales. Backend — `runFollowUpSends()` in `event-forms.server.ts`, new cron route `api/public/event-follow-ups`. Config — two pg_cron jobs (follow-ups every 10 minutes, the dormant event reminders hourly).
- **Backend / schema:** migration adding `auto_send`, `auto_sent_at`, `auto_reminder_at` to `event_forms` with grants; no RLS change (the run uses the privileged server path, as the manual send already does).
- **Testing & verification:** past event with an active follow-up form → invitation lands for each confirmed attendee, link opens the feedback page, answer stored; second cron tick sends nothing; recipient invited four days ago and unanswered → exactly one reminder; completed or cancelled recipients skipped; auto-send off → nothing sent, manual button still works.
- **Risks & rollback:** blast radius is attendee email, so the guards above matter most. Rollback = unschedule the cron job; the columns are additive and safe to leave.
- **Follow-ups:** the 15-minute delay is fixed in code; a per-form delay picker can come later if staff want one.
