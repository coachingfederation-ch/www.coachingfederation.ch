# Grace-period retention: warnings, a due list, and a nightly job

Two things in this change.

1. Tick **Auth allowlists** in the go-live runbook as done.
2. Build the missing retention machinery. Today a member who disappears from
   the ICF feed is moved into the grace window and a row is written to the
   lifecycle queue — and then nothing ever reads it. No warning reaches the
   member, and deletion only happens if an admin happens to press "Clean up".

## How it will work

```text
member drops out of the feed
        |
   grace window opens  --(existing re-engagement email)
        |
   30 days before the deletion date  -> warning email to the member
        |
    7 days before                    -> final warning email
        |
   deletion date passes -> member appears on a staff "due for deletion" list
                           + a daily notice to the chapter office
                           -> staff confirms the clean-up
```

Deletion stays a human decision, as chosen: the job never erases anyone by
itself. It only warns the member, keeps the queue honest, and makes sure staff
cannot fail to notice that a clean-up is owed.

A member who reappears in the feed before the date is closed out of the queue
automatically as "returned", and gets no further warnings.

## What staff see

A **Retention** card on the integration screen:

- how many members are in the grace window,
- how many have had the 30-day and 7-day warning,
- how many are past their date and awaiting confirmation, with a link to the
  list and the existing "Clean up" action.

The office also receives one plain daily email when — and only when — members
are waiting, so nobody has to remember to look.

## Emails to the member

Two new messages, warm rather than administrative: their chapter record has
lapsed, what happens on the date, and how to renew or write to the chapter
office. German, French, Italian and English, in the member's correspondence
language. Both flow through the existing member email pipeline, so the
suppression switch and the test-inbox redirect apply, every intent is logged,
and no member is warned twice for the same grace window.

## Technical notes

- Migration: add `final_notice_at timestamptz` to `member_lifecycle_queue`
  (`notified_at` carries the 30-day warning). No grants or policy changes —
  the table already grants `service_role` and staff read.
- New `src/lib/member-lifecycle.server.ts` exporting `runLifecycleSweep()`:
  resolve returned members (`resolution = 'reactivated'`), send the 30-day and
  7-day warnings stamping the two columns, count overdue rows, and send the
  office digest with an idempotency key of `lifecycle-digest-<yyyy-mm-dd>` so a
  double cron run cannot double-mail. Returns
  `{ resolved, warned30, warned7, due, digestSent }`.
- Lead times as named constants (`GRACE_NOTICE_DAYS = 30`,
  `GRACE_FINAL_NOTICE_DAYS = 7`) next to `grace_period_days`, so a shorter grace
  window than 30 days collapses to one warning instead of mailing on day zero.
- New templates `member-grace-notice` and `member-grace-final-notice` plus a
  `member-grace-copy.ts` translations file, registered in
  `src/lib/email-templates/registry.ts`; office digest reuses the internal
  notification path.
- New route `src/routes/api/public/member-lifecycle.ts` (POST,
  `isAuthorisedCronRequest`), modelled exactly on
  `src/routes/api/public/live-chat-purge.ts`, logging the counts.
- Daily `pg_cron` schedule at 04:15 UTC via `net.http_post` with the
  `x-cron-token` header, matching the existing jobs; documented on the route.
- New admin server fn `getLifecycleRetentionSummary` in
  `src/lib/members.functions.ts` feeding the Retention card; the card reuses
  the existing `cleanupExpiredMembers` action, so no new privileged surface.
- Docs: `docs/operations-and-go-live.md` (tick auth allowlists in the blocked
  list, next-action item 3 and the Gate 1 row; replace the "nothing reads
  `member_lifecycle_queue`" gap with the implemented job and its cadence) and
  `docs/member-sync.md` (the state machine gains the two warnings and the
  staff-confirmed deletion step).

## PR note

**Summary** — Implements the grace-period retention commitment: two warning
emails to the member, automatic closure when a member returns, a staff-visible
due-for-deletion list and a daily office notice, driven by a new nightly cron
endpoint. Anonymisation stays a confirmed staff action. Also ticks the auth
allowlist item in the runbook.

**Changes** — UI: Retention card on the integration screen. Server: lifecycle
sweep helper, cron route, admin summary fn, two member email templates in four
languages, office digest. Docs: runbook and member-sync updated.

**Backend / schema changes** — One additive migration: `final_notice_at` on
`member_lifecycle_queue`. One new daily `pg_cron` job. No grant or policy
changes.

**Testing & verification** — A seeded grace row 30 and 7 days out produces one
warning each and stamps the columns; re-running the sweep the same day sends
nothing further; a member returned to the feed is closed as reactivated and
stops receiving warnings; an overdue row appears on the card and in the office
digest exactly once per day; the endpoint returns 401 without the cron token;
suppression and redirect are honoured; all four languages render.

**Risks & rollback** — The job sends member-facing email, so it ships with the
suppression gate on and is first exercised with `email_redirect_to` pointed at
a test inbox. Nothing is deleted by the job, so the worst failure is a missing
or duplicate notice. Rollback is removing the cron schedule; the column and
templates are inert without it.

**Follow-ups / known debt** — No member-facing "keep my account" self-service;
no reminder escalation if staff leave a due list unattended beyond a day.
