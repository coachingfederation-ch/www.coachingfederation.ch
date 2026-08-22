# Fix "Registration is closed for this event" on a wide-open event

## What I verified

The event in question (published, RSVP members with guests allowed, no open/close
dates, no capacity) is genuinely open everywhere it counts:

- The public events view computes `registration_open = true` for it — the close
  rule now only fires when an explicit close date is set.
- The database guard trigger only raises "registration has closed" when a close
  date exists and has passed. It does not raise for this event.
- The row-level rule that lets a guest insert only checks: published, mode is not
  "none", and guests allowed. All true here.

So the message the visitor sees is **not** the "registration window is closed"
state. It is the error branch shown after the form is submitted — the same wording
is used for a submit failure.

## The real problem

The server maps a failed insert to a user-facing reason by matching words in the
database error text. The last rule matches any message containing the word
"registration" — and every error on that table mentions the table name
`event_registrations`. So unrelated failures (a check constraint on locale or
email shape, a missing/invalid column, a foreign key) all get reported to the
visitor as "Registration is closed for this event", hiding the actual cause.

This is a confirmed misclassification. Which underlying error is being hidden is
not yet confirmed — the fix makes it visible and then addresses it.

## Plan

1. **Stop the catch-all.** In the failure mapper, match only the exact phrases the
   database guard raises ("registration has closed", "registration has not opened
   yet", "event is not open for registration", "does not take registrations").
   Everything else falls through to the generic error reason instead of claiming
   the event is closed.
2. **Log the raw failure** server-side (code, message, details, hint, event id) on
   any unmapped insert error, so the actual cause is visible in the server logs.
   No attendee data in the log line beyond the event id.
3. **Reproduce and fix the underlying error.** Submit a registration against this
   event through the public page, read the logged database error, then fix the
   real cause (most likely candidates, in order: the `locale` check constraint
   rejecting a value the form sends, the email-shape check, or a column the insert
   sends that the table no longer accepts).
4. **Re-verify** by registering once as a guest and once signed in, confirming the
   row lands and the confirmation email path runs.

## PR note

**Summary** — Registrations on an open event fail with a misleading "registration
is closed" message; the failure mapper turns every database error on the
registrations table into the "closed" reason. Tighten the mapping, log the real
error, then fix the underlying insert failure.

**Changes**
- Backend: `src/lib/tickets.server.ts` — precise error-phrase matching, log raw
  database errors for unmapped failures.
- Follow-up fix in the same area once the logged cause is known.

**Backend / Schema changes** — None expected. If the logged cause is a constraint
mismatch (for example an unsupported locale value), the fix will be in the
application payload rather than the schema.

**Testing & Verification** — Guest registration and signed-in member registration
on this event; confirm a confirmed row is written and the confirmation is queued.
Check that a genuinely closed event (explicit past close date) still shows the
closed message.

**Risks & Rollback** — Small blast radius, one function. Reverting restores the
previous (over-broad) message mapping.

**Follow-ups** — Consider surfacing the reason code in the staff-facing logs for
all registration failures, not just unmapped ones.
