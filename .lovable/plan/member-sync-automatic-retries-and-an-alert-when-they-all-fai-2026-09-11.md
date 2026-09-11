# Member sync: automatic retries and an alert when they all fail

## What happened at 05:15

The nightly member sync started exactly on schedule (03:15 UTC = 05:15 Zurich). The
scheduler did its job and the request reached the site, but the sync process was cut
off partway through — before it could even record its first step, so it stopped while
still asking ICF Global for the member list. Nothing was written, nothing was lost.

The run stayed on "running" until the safety net closed it four hours later and marked
it failed with "Abandoned — the sync process stopped before it could finish." The
manual run at 09:49 then completed normally with 442 members, so the only real
consequence was a day without a fresh import.

There is currently no retry: a lost run simply waits for the next night, and nobody is
told.

## What we build

1. **Three automatic retries** after a failed or abandoned nightly sync: 15, 30 and 45
   minutes after the scheduled start (03:30, 03:45, 04:00 UTC).
   - Each retry first checks whether the night's sync already succeeded; if it did, it
     does nothing.
   - A retry also does nothing while a run is still genuinely in progress, and never
     runs during a cutover.
   - A run stopped by a safety guard (empty feed, big drop) is a deliberate abort, not
     a transient failure — those are not retried.
2. **Alert email to Super Admins** when the third retry also fails: one message per
   night, naming the time, the number of attempts and the last error, with a link to
   the Integration screen. Sent to every account holding the Super Admin role.
3. The Integration screen's run table already shows every attempt, so the retries are
   visible there without changes.

## Technical details

- New endpoint `src/routes/api/public/member-sync-retry.ts`, same cron-token auth as
  the existing jobs. Body/query carries the attempt number (1–3).
- New helper `src/lib/member-sync-retry.server.ts`:
  - looks at `member_sync_runs` since the night's scheduled start;
  - returns early on `succeeded`, on a still-`running` row younger than
    `ABANDONED_RUN_MINUTES`, on `aborted` (guard-stopped), or when
    `integration_config.cutover_in_progress` is set;
  - otherwise calls `reapAbandonedRuns()` then `runMemberSync({ triggerSource: "cron" })`;
  - on attempt 3 failure calls the new alert.
- `trigger_source` stays `cron` (the enum column is free text but the UI reads known
  values); the attempt number is written to `member_sync_events` as a
  `sync_retry_attempt` event so the run log shows which try it was.
- Alert: `src/lib/email-templates/member-sync-failed.tsx` + copy file, following the
  `article-review-request` pattern — recipients are `user_roles.role = 'admin'`
  resolved to addresses via `auth.admin.getUserById`. Sent through the existing mail
  sender with an idempotency key `sync-alert-<date>` so a repeat call cannot double-send.
- Three `pg_cron` jobs (`icf-member-sync-retry-1/2/3`) at `30 3 * * *`, `45 3 * * *`,
  `0 4 * * *`, created with run_sql like the other environment-specific jobs, token read
  from `private.app_config`. Three fixed daily calls, no polling.
- No schema change.
- Docs: `docs/member-sync.md` gains a "Retries and alerting" section; `docs/operations`
  cron table gains the three jobs.

## PR note

- **Summary** — The nightly ICF sync had no recovery path: a lost worker meant a silent
  missed day. Adds three delayed retries and a Super Admin alert when all fail.
- **Changes** — New retry endpoint and helper, new alert email template and copy, three
  scheduled jobs, docs.
- **Backend / schema changes** — No schema change; three new `pg_cron` jobs.
- **Testing & verification** — Call the retry endpoint with a valid token after a
  successful run (expect no-op), after a forced failed run (expect a new run), and with
  attempt 3 (expect the alert, checked in the email log). Verify unauthorised calls get
  401 and that a cutover blocks the retry.
- **Risks & rollback** — Low; retries are guarded against overlap and the drop guard
  still protects the data. Rollback = unschedule the three jobs.
- **Time limit** — A sync gets a hard 5-minute budget (real runs take seconds). If it
  is still going, it stops itself, records the run as failed with "Timed out after 5
  minutes" and hands over to the next retry — no more four-hour "running" rows. The
  abandoned-run safety net stays as a backstop for a worker that dies outright.
- **Follow-ups** — Root cause of the worker cut-off is untreated; if timeouts recur,
  the ICF request needs chunking.

