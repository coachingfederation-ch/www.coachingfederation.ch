# Clear the welcome queue for existing members

The welcome email currently has 441 members waiting, because the first full sync
recorded every existing member as "new". Only members who really joined from
September 2026 onwards should get a welcome.

## What changes

- 439 waiting welcome emails belong to members who joined before 1 September 2026.
  Those get marked as skipped, with the reason "Existing member before September 2026".
- The 2 remaining waiting welcome emails stay in the queue.
- Other campaigns (credential upgrade, specialisation, grace period) are untouched.

The rows are kept rather than deleted, so the same members can never be
re-detected and queued for a welcome again by a later sync.

## Result on screen

The Member engagement queue drops from 441 waiting to 2, and the skipped rows
stay visible in the history with their reason.

## Technical note

A single data update on `member_engagement_sends`: set `status = 'skipped'` and
`error_message` for rows where `campaign_key = 'welcome_new_member'`,
`status = 'pending'`, and the joined `members.membership_join_date < '2026-09-01'`.
No schema change, no code change.

## PR note

**Summary** — Retires the backlog of welcome emails created when the first sync
imported the existing membership as new members.

**Changes** — Data only: 439 pending `welcome_new_member` sends moved to `skipped`.

**Backend / schema changes** — None (data update only).

**Testing & verification** — Row counts checked before and after; queue count in
the Member engagement screen re-read; other campaigns confirmed unchanged.

**Risks & rollback** — Low. Rows remain and could be set back to `pending` by the
same filter if ever wanted.

**Follow-ups** — None; dedupe keys prevent re-queuing.
