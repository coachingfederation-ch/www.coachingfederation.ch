# Fix the stuck member sync (feed-drop guard counts already-inactive members)

## What is actually happening

No purge or resync is needed — the feed is fine and the guard is measuring the wrong baseline.

Verified against the database:

- The run on 21 Aug at 21:57 succeeded: 443 members in the feed, 141 created, 302 updated, 199 moved into the grace (inactive) lifecycle.
- Members on record now: 443 active, 199 grace.
- The safety valve compares the feed against **every non-anonymized member row** (443 + 199 = 642), so it reports a 31.0% drop and aborts — even though the active population (443) matches the feed exactly.

The two runs since then (03:15 cron and 06:56) aborted for this reason. This is a deadlock: every future run will abort with the same message, because the 199 rows the previous run legitimately deactivated permanently inflate the baseline until their 60-day grace window expires.

Overriding the threshold once would clear today's run but leave the bug; the number would drift again after the next real drop.

## The fix

1. **Correct the baseline** in `src/lib/member-sync.server.ts`: the drop guard compares the feed count against members in the `active` state only (the population the feed is supposed to mirror), instead of all non-anonymized rows. Grace/inactive members are already out of the feed by definition and must not count as a "drop". The empty-feed abort stays exactly as it is.

2. **Add a one-off admin override** on `/integration`, next to "Run sync now": an admin-only "Run sync, ignore drop guard" action. It skips the percentage guard for that single run (never the empty-feed abort), records the override in the run log as an audit event with the acting admin, and is never available to the cron path. This gives a legitimate escape hatch for a genuinely large but correct drop, without editing the configured threshold.

3. After the fix, run the sync manually from `/integration` and confirm it succeeds with 0 deactivations and no created/updated churn beyond expected field changes.

## Technical notes

- `src/lib/member-sync.server.ts`: change the existing count query to filter `activity_state = 'active'`; thread an optional `ignoreDropGuard` flag through `runMemberSync` options and log a `feed_drop_override` sync event when it is used.
- `src/lib/members.functions.ts`: `runSyncNow` gains an optional validated `ignoreDropGuard` boolean, admin role re-verified server-side as today.
- `src/routes/_staff/integration.tsx`: second button wired to the same action; new CMS strings in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- No schema change, no migration, no data deletion.

## PR note

**Summary** — The member sync feed-drop safety valve compared the ICF feed against all non-anonymized members, including ones a previous run had already moved to grace, so every run after a large legitimate deactivation aborts permanently. The baseline is corrected to active members, and admins get an explicit one-off override.

**Changes**
- Backend: drop-guard baseline is now the active member count; optional `ignoreDropGuard` run flag with an audit event.
- UI: admin-only "Run sync, ignore drop guard" action on `/integration`, localized DE/FR/IT/EN.

**Backend / schema changes** — None. No migration, no RLS change.

**Testing & verification** — Manual sync run as an admin after the fix; expect `succeeded`, feed 443, 0 deactivated. Confirm the cron path still aborts on an empty feed and still respects the guard (no override available to cron). Confirm the 199 grace members are untouched and their deletion schedule is unchanged.

**Risks & rollback** — Narrow: one comparison and one optional flag. Worst case the guard is slightly less conservative for members already inactive, which is the intended behaviour. Revert the file changes to roll back; no data migration to undo.

**Follow-ups / known debt** — Consider surfacing the guard's baseline (active count vs feed count) in the sync run detail view so an abort explains itself without a database query.
