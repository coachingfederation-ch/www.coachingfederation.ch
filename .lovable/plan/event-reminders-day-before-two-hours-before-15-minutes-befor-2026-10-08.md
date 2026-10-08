# Event reminders: day before, two hours before, 15 minutes before

Attendees with a confirmed seat get three reminder emails. The one-week reminder is removed.

| Reminder | When it goes out | Content |
|---|---|---|
| Day before | 24 hours before the start, moved to 9 p.m. Zurich time the evening before if that time falls between 9 p.m. and 8 a.m. | Full details: when, where, online link, ticket and QR, practical notes |
| Two hours before | 2 hours before the start | Short: "starts at 18:30", where or the online link, ticket link |
| 15 minutes before | 15 minutes before the start | Very short: "starting in 15 minutes", with the join link (online/hybrid) or the venue (in person) |

Examples (Zurich time):
- Event at 18:30: the day-before email goes out at 18:30 the previous day.
- Event at 22:00: 22:00 the day before is too late, so it goes out at 21:00 that evening.
- Event at 07:30: 07:30 the day before is too early, so it goes out at 21:00 the evening before.

Rules:
- **Late sign-ups** only get the reminders that are still ahead. Someone who registers an hour before the start gets the 15-minute reminder only.
- **Skipped seats**: cancelled, unpaid, or refunded seats, events that aren't published, and events without registration.
- **One email per stage**: each attendee gets each reminder at most once, even if a run is repeated.
- **Stale reminders**: a reminder is never sent once the next one is due. If the day-before email was missed, the two-hour email replaces it rather than both arriving together.
- Emails use the attendee's registration language (DE / FR / IT / EN) and the organiser as reply-to, as today.

## Timing check

To send the 15-minute email on time, the reminder check must run every 5 minutes instead of hourly. That is 288 runs a day, up from 24. Each run is a quick lookup that finds nothing most of the time, but frequent runs keep the backend awake and can raise Cloud costs slightly. In return, the reminders arrive at most 5 minutes late. Running every 15 minutes would cost less but could deliver the "15 minutes before" email as the event starts.

## Technical details

- **Migration**: add `reminder_2h_sent_at` and `reminder_15m_sent_at` to `event_registrations`. `reminder_1d_sent_at` stays. `reminder_7d_sent_at` stays in place but is no longer written.
- **`src/lib/event-reminders.server.ts`**:
  - Stages become `day | hours2 | minutes15`, each with its own claim column.
  - A `dueAt(stage, startsAt)` helper computes the send time. The day stage uses the start minus 24 hours, converted to Europe/Zurich; if it falls outside 08:00–21:00 it moves to 21:00 on the evening before the start date.
  - Each stage has a send window from its due time to the next stage's due time (day → 2 h, 2 h → 15 min, 15 min → start).
  - A registration is reminded only if it was created before the due time (the late sign-up rule) and its stage column is still empty.
  - The run queries events that start within the next 36 hours and evaluates the windows in code. The existing claim, release-on-failure, and idempotency key (`event-reminder-<stage>-<registrationId>`) stay.
- **Email**: `src/lib/email-templates/event-reminder.tsx` and `event-reminder-copy.ts` get a `stage` of `day | hours2 | minutes15` with matching subjects, preview text, and headings in EN/DE/FR/IT. The short stages leave out practical notes. The week copy is removed.
- **Schedule**: change the `event-reminders-hourly` job to every 5 minutes and rename it `event-reminders-5min`. The endpoint and cron-token auth are unchanged.
- **Docs**: update `docs/events-and-ticketing.md` (reminder section) and the endpoint header comment.

## PR note

- **Summary**: replaces the one-week and day-before reminders with day-before (sent between 08:00 and 21:00 Zurich time), two-hour, and 15-minute reminders for confirmed attendees.
- **Changes**:
  - Backend: new reminder stages and timing logic in `event-reminders.server.ts`.
  - Email: template and copy for the three stages in four languages.
  - Config: the reminder job runs every 5 minutes.
- **Backend / schema changes**: two nullable timestamp columns on `event_registrations`. No change to row security rules.
- **Testing & verification**:
  - Unit-check `dueAt` for 18:30, 22:00, and 07:30 starts, and across the daylight-saving change on Oct 25.
  - Create a test event about 2.5 hours out with a test registration; confirm the two-hour and 15-minute emails arrive once each.
  - Confirm a sign-up made after the two-hour mark gets only the 15-minute email.
  - Confirm cancelled seats get nothing.
  - Preview all three stages in four languages.
- **Risks & rollback**: these emails go to attendees, so the per-stage claim column and idempotency key prevent duplicates. To roll back, set the job back to hourly and revert the code; the new columns are safe to leave.
- **Follow-ups**: none planned.
