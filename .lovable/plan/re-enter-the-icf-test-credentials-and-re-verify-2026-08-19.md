# Re-enter the ICF TEST credentials and re-verify

Yes — re-entering the secrets is the right next step before escalating to ICF.
It rules out a bad paste, an invisible character, or a value that was replaced
at some point without the change being noticed.

## What happens

1. A secure form opens with the four TEST integration secrets. Values go
   straight into the encrypted secret store — they never pass through the chat
   and are never written into the repository.
   - ICF_SOAP_TEST_BASE_URL
   - ICF_SOAP_TEST_USERNAME
   - ICF_SOAP_TEST_PASSWORD
   - ICF_SOAP_TEST_CST_KEY
2. Enter each value fresh from the ICF onboarding mail / password manager.
   Type or paste carefully — no trailing space, no line break.
3. Run "Check ICF credentials" on the Integration page again. The panel will
   show, per endpoint, whether login succeeded and the exact fault text, plus
   the shape report (length, whitespace, newline) for each secret so a bad
   paste is visible immediately.
4. If login succeeds, trigger a manual sync to confirm the nightly job recovers.

## What the two possible outcomes mean

- Login succeeds: a stored secret had drifted; nothing further needed on ICF's
  side.
- Same `Invalid Credentials Supplied` with clean shapes: the account itself is
  rejected on ICF's side (rotated, expired or locked). At that point the note
  to ICF is justified, and the check log gives a dated trail.

## Notes

- No code changes are involved. The diagnostic panel and server function
  already exist.
- LIVE secrets are left untouched — the integration is still in TEST mode, so
  only the TEST set is being exercised.
- Every check writes one outcome-only row to the sync event log.

## PR note

**Summary** — Operational step only: re-enter the four ICF TEST secrets and
re-run the existing credential diagnostic to exclude a local cause before
escalating to ICF.

**Changes** — None to code.

**Backend / schema changes** — None (one `member_sync_events` row per check,
as already implemented).

**Testing & verification** — Run "Check ICF credentials" as an admin after the
secrets are saved; if it passes, run a manual sync and confirm the run
completes.

**Risks & rollback** — Re-entering the TEST secrets affects only the TEST sync
path; rollback is re-entering the previous values.

**Follow-ups** — If the fault persists, send ICF the account-status request.
