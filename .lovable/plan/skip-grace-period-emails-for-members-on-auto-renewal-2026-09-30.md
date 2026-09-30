# Skip grace-period emails for members on auto-renewal

When the ICF feed says a member has **Auto-renewal = Yes**, none of the three grace-period emails (re-engagement, first warning, final warning) are sent to them.

## Behaviour

- The nightly sweep no longer queues grace-period emails for auto-renewing members.
- Emails already waiting in the queue for such a member are marked **skipped** with the reason "Auto-renewal active" instead of being sent. This covers the three re-engagement emails currently on hold and anyone whose flag changes after queueing.
- If auto-renewal is later switched off and the member is still past expiry, the sweep queues the emails normally on its next run.
- Members with no auto-renewal value in the feed are treated as "No" (emails go out as today).
- Retention card counts ("past expiry") exclude auto-renewing members, so staff see only people who really need follow-up.

## Technical details

- The flag lives in `members.diagnostics.auto_renewal` (verbatim feed value, "Y"/"Yes"). Add one shared helper `isAutoRenewing(diagnostics)` matching `/^y/i`, reused by the staff member detail panel (replacing its inline check).
- `src/lib/member-lifecycle.server.ts`: select `diagnostics` in `lapsedMembers()` and filter out auto-renewing members.
- `src/lib/member-engagement/dispatch.server.ts`: before sending a `grace_reengagement`, `grace_first_warning` or `grace_final_warning` row (automatic or released), re-check the member's flag and mark the row skipped with the reason — this is the safety net for queued rows.
- No schema changes. Update `docs/` member lifecycle section.

## PR note

**Summary** — Stops grace-period emails for members whose ICF membership renews automatically.

**Changes** — Lifecycle sweep filter; dispatch-time skip for grace campaigns; shared auto-renewal helper; docs.

**Backend / Schema Changes** — None.

**Testing & Verification** — Check the 3 pending re-engagements against their flag; run the sweep and confirm auto-renewing members are not queued; release a queued row for an auto-renewing member and confirm it is skipped, not sent.

**Risks & Rollback** — Limited to grace campaigns; revert the code to restore previous behaviour.

**Follow-ups / Known Debt** — Auto-renewal is still read from the stored feed extras rather than a dedicated column.
