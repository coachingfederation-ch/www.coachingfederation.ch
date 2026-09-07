# Why the last sync still says "running" — and how to stop it happening

## What I found

The 7 September 03:15 UTC sync row is genuinely stuck, not a display bug:

- The run row was created (`status = running`, started 03:15:02) and never updated: no finish time, no member count, no error.
- It produced **nothing at all** — zero member snapshots and zero log entries for that run, not even the "which address we connected from" entry that is written a moment after the run starts.
- Every earlier run finished in roughly 40 seconds.

So the sync process was cut off within the first seconds, before it could write anything. Because the status is only ever set at the end (success, failure, or abort), a process that dies mid-way leaves the row on "running" forever.

The scheduler saying "finished" is expected and unrelated: the schedule only fires the request and reports whether the request was *sent*. It does not wait for the sync to complete, and it times out its own wait after five seconds regardless. So "scheduler finished" never means "sync finished".

Note: nothing currently cleans these up, and the run list has no notion of a run being too old to still be alive. The health card treats "running" as a soft warning forever, so a stuck row silently hides the fact that no sync happened for a day.

## What to change

1. **Mark abandoned runs as failed.** At the start of every sync (and when the integration screen loads its run list), any run still marked "running" whose start is older than a safe cut-off — 30 minutes, versus the ~1 minute a real run takes — is closed as `failed` with the message "Abandoned — the sync process stopped before it could finish." This also prevents two runs appearing to overlap.
2. **Show liveness in the list.** A "running" row younger than the cut-off keeps its current look; older than that it displays as failed, exactly as the data will then say.
3. **Health card honesty.** The relay/health check treats a stale "running" row as a failure rather than a warning, so the screen turns red when a day's sync silently disappeared.
4. **Re-run today's sync** manually once the cleanup lands, so the member data is current again.

Not in scope: changing why the process was cut off. There is no evidence in the record of a specific error — the run left no trace — and a stuck row will keep being possible for any interruption, so making the system self-correct is the right fix. If it recurs after this change, the run will now be recorded as failed with a timestamp, which gives us something to trace.

## Technical notes

- `src/lib/member-sync.server.ts`: add `reapAbandonedRuns()` (update `member_sync_runs` set `status='failed'`, `finished_at=now()`, `error_message='Abandoned…'` where `status='running'` and `started_at < now() - 30 min`); call it at the top of `runMemberSync` before inserting the new run row.
- `src/lib/integration.functions.ts` (or whichever server fn feeds the integration screen's run list — the one calling `fetchRecentSyncRuns`): call the same reaper before reading, so opening the screen self-heals.
- `src/lib/relay-health.server.ts:150`: `running` older than the cut-off → `level: "fail"` instead of `"warn"`.
- No schema change, no migration.

## PR note

**Summary** — A member sync run interrupted before completion stays "running" forever because status is only written at the end. Add an abandoned-run reaper and make the health card report stale runs as failures.

**Changes**
- Backend: `reapAbandonedRuns()` in `member-sync.server.ts`, called from `runMemberSync` and from the integration screen's run-list loader.
- UI: relay health treats a stale `running` row as failed.

**Backend / Schema changes** — None (data-only status correction of already-dead rows).

**Testing & Verification** — Confirm the 7 September row flips to failed; trigger a manual sync and confirm it completes and appears as succeeded; confirm a fresh in-flight run is not reaped; confirm the health card returns to green.

**Risks & Rollback** — Low. Worst case a genuinely long run (>30 min) is mislabelled; real runs take ~1 minute. Rollback is reverting the two files.

**Follow-ups / Known debt** — No heartbeat on member sync (Europe Pulse has one), so the cut-off is a fixed timeout rather than true liveness. No alert when a scheduled sync produces no run at all.
