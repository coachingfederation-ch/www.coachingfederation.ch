# Automatic event cancellation notices

## Summary

Cancelling an event notifies its registered attendees automatically. Reuse the existing cancellation email and per-registration delivery guard so attendee addresses remain private and retries do not duplicate successful notices.

## Changes

- Server: after the caller-authorized event status update succeeds, send an event-specific notice for each confirmed free or paid registration, including registered guests.
- Email: distinguish an event being cancelled from an individual registration cancellation in EN, DE, FR, and IT. Do not imply the individual 48-hour refund policy applies.
- UI: retain the existing cancelling indicator and report failed notices without pretending the cancellation failed.
- Documentation: update event behavior, architecture, and code map.

## Backend / Schema Changes

None. Reuse existing cancellation delivery fields and managed delivery; no email queue, table, or scheduled job.

## Testing & Verification

Verified: all 12 tests pass with `bunx vitest run --config vitest.cancellation.config.ts`. These cover registered free/paid attendees and guests, excluded unpaid/cancelled rows, 205 recipients over multiple pages, concurrent calls, retries, suppression, reopening, individual notices, and authorization before dispatch. The isolated test configuration bypasses TanStack's RPC compiler for mocked handler tests. Signed-in browser verification created a temporary private empty event, cancelled it through Publish, saw confirmation, reloaded and read back its cancelled status, then removed the draft. No real attendees were emailed. The latest app build check passed.

## Risks & Rollback

Only the event cancellation path and shared cancellation email variant change. Refund processing and individual registration cancellation remain unchanged. Revert the event hook and variant to disable automatic notices; no schema rollback needed. Large attendee lists extend the existing cancelling state while emails are submitted.

## Follow-ups / Known Debt

Actual inbox delivery and rendering cannot be verified without sending an email. Automatic refunds on whole-event cancellation are outside this request.
Lint reports three existing Fast Refresh warnings in the shared cancellation template, with no errors. No styling changes or design-system deviations were introduced.
