# Europe Pulse: fix the stalled weekly run, then rerun it

## What actually happened

Monday's automatic run (07 Sep, 06:00) scanned the first 6 of 29 chapter
websites in about two minutes, then stopped and was later marked
"Run stopped making progress and was closed automatically." No items were
curated, so this week's feed is empty.

Verified from the run history and the scheduler:

- The run wrote its last progress at 06:01:54 with 6/29 chapters done, 6 ok.
- A scan is deliberately split into short slices; after each slice the app is
  supposed to poke itself to start the next one. That poke is sent without
  waiting for it, and the server shuts the request down as soon as the reply
  goes out — so the next slice was never started.
- The safety net that should have picked the run back up runs only once an
  hour (at :20). When it ran at 06:20 it first cleaned up "runs with no
  progress for 15 minutes" — which by then included this run — and then found
  nothing left to resume. Its recorded answer was literally "advanced: false".

So the run was killed by its own safety net. The 15-minute abandon window is
shorter than the 60-minute resume interval, which means any run that loses the
self-poke is guaranteed to be closed instead of resumed. This is not a
chapter-website or rate-limit problem: all 6 chapters scanned fine.

## The fix

1. **Make the hand-over survive.** In `src/lib/europe-pulse.server.ts`,
   `kickNextSlice` becomes awaited with a short timeout (and the endpoint sends
   it before returning), so the next slice is genuinely started rather than
   dropped when the request ends.
2. **Stop the safety net from killing resumable runs.** Raise the abandon
   window (`STALE_MINUTES`) from 15 to 90 minutes — comfortably longer than the
   resume interval — and change `advanceEuropePulseRun` so it resumes first and
   reaps only afterwards. A run whose slice lock has expired is picked up and
   continued, not closed.
3. **Resume more often.** Change the `europe-pulse-advance-hourly` schedule
   from hourly to every 5 minutes (`*/5 * * * *`). Each call is a no-op when no
   run is unfinished, so the cost is negligible; a scan that loses one
   hand-over then resumes within 5 minutes instead of being lost.
4. **Rename the job** to `europe-pulse-advance-5min` so the name matches the
   cadence.

Cadence note: the resume job then runs 288 times a day instead of 24. Almost
all of those return immediately without touching anything; the trade-off is a
few extra idle checks per hour against a weekly scan that currently fails
whenever a slice hand-over is lost.

## Then rerun

After the fix, start a fresh run for the week of 07 Sep from the staff page and
watch it walk through all 29 chapters, curate, and publish. Confirm the run row
ends `succeeded` with a non-zero item count, and that `/europe-pulse` shows the
new week.

## PR note

**Summary** — The weekly Europe Pulse scan stalled after its first slice
because the self-hand-over between slices is dropped when the request ends, and
the hourly backstop closed the run as abandoned instead of resuming it. This
makes the hand-over reliable, widens the abandon window past the resume
interval, and resumes every 5 minutes.

**Changes** — Backend only: `src/lib/europe-pulse.server.ts` (awaited
hand-over, `STALE_MINUTES` 15 → 90, resume-before-reap ordering),
`src/routes/api/public/europe-pulse-scan.ts` (await the kick), scheduler job
recreated at `*/5 * * * *`.

**Backend / schema changes** — No migration. One scheduled-job change
(`europe-pulse-advance-hourly` dropped, `europe-pulse-advance-5min` created).

**Testing & verification** — Trigger a run from `/manage/europe-pulse`; confirm
slices advance without manual help, the run reaches `succeeded` with all 29
chapters, items appear on `/europe-pulse`, and the unauthorised-call rejection
still returns 401.

**Risks & rollback** — Low. Reverting the code restores the old behaviour; the
job can be put back on the hourly schedule with one statement. Worst case a run
takes a few minutes longer.

**Follow-ups / known debt** — If a run ever legitimately hangs, 90 minutes is
now the time before it is closed; consider a per-slice failure counter instead
of a pure time window.
