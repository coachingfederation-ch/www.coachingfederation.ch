# Fix: "Membership & Engagement" cannot be granted

## What's happening

It's a bug, and it is not limited to internal accounts.

The database rule that decides which access rights a Super Admin may hand out
was written before "Membership & Engagement" existed and was never extended. It
currently allows Administrator, Editor, Event organizer, Publisher and Super
Admin — Membership & Engagement is missing from both the grant rule and the
revoke rule.

So every attempt to tick that right is rejected by the database, for imported
members and for internal accounts alike, and the screen shows the generic
"Could not grant access" error.

## The fix

One database migration that adds `membership` to the two rules:

- the grant rule, keeping the existing requirement that the account is either a
  linked member or a live internal account (Super Admin stays exempt, as today);
- the revoke rule, so the right can also be taken away again.

No application code changes: the panel, the server functions and the audit trail
already handle the right correctly — they only ever failed at the database
boundary.

## Verification

- Grant Membership & Engagement to an internal account with no member record,
  then reload — the tick persists and the account audit shows the grant.
- Revoke it again — the tick clears and the audit records the revoke.
- Grant/revoke it on an imported member as well.
- Confirm the other four rights and the Super Admin switch still behave as before,
  including the self and last-Super-Admin guards.

## PR note

**Summary** — Membership & Engagement could never be granted or revoked because
the `user_roles` RLS policies omit that role; this migration adds it.

**Changes** — Backend only.

**Backend / Schema Changes** — Replaces the `admins grant managed roles` INSERT
policy and the `admins revoke managed roles` DELETE policy on `public.user_roles`
to include `membership`. No table, column or grant changes.

**Testing & Verification** — As above, run as a Super Admin against one internal
account and one imported member.

**Risks & Rollback** — Narrow: only widens the set of assignable rights by the
one role the UI already offers. Rollback is re-creating the previous policy
bodies; safe to leave in place if UI code is reverted.

**Follow-ups** — Consider deriving the policy role list from `MANAGED_ROLES` in a
future migration so a new right cannot be added in the app without the database
rule following.
