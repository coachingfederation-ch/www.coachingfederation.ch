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
Pending: focused tests for recipient selection, paging, duplicate prevention, suppression, partial failure, authorization gating, and whole-event versus individual notices. Verify the signed-in event flow using a temporary empty draft, without sending to real attendees.

## Risks & Rollback
Only the event cancellation path and shared cancellation email variant change. Refund processing and individual registration cancellation remain unchanged. Revert the event hook and variant to disable automatic notices; no schema rollback needed. Large attendee lists extend the existing cancelling state while emails are submitted.

## Follow-ups / Known Debt
Actual inbox delivery and rendering cannot be verified without sending an email. Automatic refunds on whole-event cancellation are outside this request.