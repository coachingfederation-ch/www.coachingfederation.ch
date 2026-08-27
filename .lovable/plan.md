# Certificates panel shows nothing — diagnosis and fix

## What is actually happening

Certificates **were** issued for this event. The database holds two issued
certificates (serials ICFS-2026-00001 and ICFS-2026-00002) for the two
checked-in attendees, created at 19:27 today.

The panel cannot read them back. Every read of the certificates table by a
signed-in staff account is rejected by the database with:

```text
permission denied for table members
```

Verified by calling the data API with the signed-in staff account's own token:
the request returns 403 for `event_certificates`, even for a bare `select id`.

### Why

The certificates table has two read rules, OR'd together:

- staff who manage the event (works)
- the certificate holder, expressed as `member_id IN (SELECT id FROM members
  WHERE auth_user_id = auth.uid())`

The second rule reads the members table directly, and signed-in users are
deliberately not allowed to read the members table's `auth_user_id` column
(members is column-restricted for privacy). Postgres evaluates both rules for
every read, so the holder rule's forbidden lookup fails the whole query — for
staff too.

The same rule exists on the CCE awards table, so awards reads are broken in
exactly the same way.

The failure is invisible in the UI because the board loader ignores query
errors: the empty result is rendered as "Issued 0 / No certificates yet", and
pressing the button then reports nothing because everyone is already covered.

## Fix

1. **Migration** — replace the two holder read rules with a security-definer
   helper (e.g. `private.member_belongs_to(member_id, uid)`) that does the
   members lookup with the function owner's rights, and grant execute to
   signed-in users. Same behaviour, no direct members read from the policy.
   Applies to `event_certificates` and `event_cce_awards`.

2. **Surface errors instead of swallowing them** — in
   `src/lib/certificates.functions.ts`, `loadCertificateBoard` currently drops
   the `error` from each of its three queries. Throw on error so the card shows
   its red message rather than silent zeros.

3. **Report the outcome of the button** — `issueCompletionDocuments` already
   returns issued / skipped / sent / failed counts, but
   `src/components/events/CertificatesCard.tsx` discards them. Show a short
   result line ("2 already issued, 0 new") so a no-op click is legible. Adds
   four new localized strings (DE, FR, IT, EN).

## Also found (not fixed unless you want it)

One of the two certificate emails is stuck at `failed`: the mail provider
returned 409 "This email send already failed. Send again with a new
idempotency key." The resend action reuses the same key, so it will keep
failing. Fix would be to vary the idempotency key per attempt in
`src/lib/certificates.server.ts`. Say the word and I include it.

## PR note

**Summary** — Staff could not see issued certificates because an RLS rule on
the certificates and CCE award tables performs a members lookup that signed-in
roles are not permitted to make; the read failed and the UI rendered the error
as zero.

**Changes**
- Backend/schema: rewrite the holder read policies on `event_certificates` and
  `event_cce_awards` to use a security-definer helper.
- Server: `loadCertificateBoard` throws on query errors.
- UI: certificates card shows the issue result summary; four new strings per
  locale.

**Backend / schema changes** — one migration: new `private` helper function
plus two policy replacements. No table or column changes.

**Testing & verification** — reload the check-in screen as an editor/admin and
confirm the two existing certificates list with counts 2 issued; press "Issue
completion documents" and confirm it reports 0 new / 2 already issued; check a
member account still sees only its own certificates at /member/certificates.

**Risks & rollback** — narrow: only two read policies change, both keeping the
same intent. Rollback is restoring the previous policy text; nothing depends on
the new helper elsewhere.

**Follow-ups / known debt** — the 409 email idempotency issue above; other
policies should be audited for the same direct-members-read pattern (a scan
found only these two).
