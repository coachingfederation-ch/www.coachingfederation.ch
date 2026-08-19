# Diagnose the ICF "Invalid Credentials Supplied" fault

## What we know

- The sync code that talks to ICF has not changed since 28 July. Nightly runs
  succeeded until 5 August and have failed every night since 6 August with the
  same fault from ICF's side: `Invalid Credentials Supplied`.
- All four TEST secrets and all four LIVE secrets exist in the environment
  (base URL, username, password, chapter key). We cannot read their values,
  only that they are set.
- The fault is raised by ICF at the very first step (Authenticate), before the
  chapter key or the member query is ever used. So the failing input is the
  username/password pair or the endpoint the login is sent to — nothing later
  in the flow.
- The integration is still in TEST mode, so the TEST account is the one being
  rejected.

Because the code is unchanged, the most likely causes are: the TEST account's
password was rotated or expired on ICF's side, the account was locked after
repeated failed attempts, or the stored secret carries an invisible stray
character (trailing space or newline) from a copy-paste.

The whitelisting of the IP does not affect this: a blocked IP would fail with a
network/timeout error, not with a credentials fault. Getting the fault back
actually proves we are reaching ICF.

## Plan

### 1. A one-click credentials check on the Integration page

Add a "Check ICF credentials" panel next to the existing outbound IP panel.
Pressing it runs only the login step against ICF and reports back:

- whether login succeeded, and if not the exact fault text ICF returned
- which credential set was used (TEST or LIVE)
- a safe shape report of each secret so we can spot a bad paste without ever
  revealing values: character count, whether it starts or ends with whitespace,
  whether it contains a newline or non-ASCII character
- the exact host and path the login request was sent to
- the login step tried both against the current endpoint and against ICF's
  alternative `Signon.asmx` login endpoint, so we can tell whether we are
  simply posting the login to the wrong address

Nothing is logged or displayed that could expose a password.

### 2. Act on what the check reports

- Stray whitespace or unexpected length: re-enter the affected secret and
  re-run the check.
- Clean secrets, still rejected: the credentials are no longer valid on ICF's
  side. Send ICF a short note asking them to confirm the TEST xWeb account is
  active and not locked, and to reissue the password if needed.
- Login succeeds against the alternative endpoint only: fix the endpoint the
  login is posted to and the nightly sync is restored.

### 3. Keep the audit trail

Record every credential check as an entry in the existing sync event log
(outcome and fault text only, never the values), so the history of what was
tried and when is available to both us and ICF.

## Technical notes

- New server function `checkIcfCredentials` (admin-only, same guard as the
  existing outbound-IP diagnostic) in the members functions module; the actual
  work sits in a server-only helper alongside `icf-soap.server.ts`.
- It reuses `soapCredentials(mode)` for URL derivation, calls `Authenticate`
  directly, and returns `{ mode, endpointTried, altEndpointTried, ok, fault,
  secretShapes }`. Secret shapes are computed from `process.env` inside the
  handler; values never leave the server.
- UI: a new card in `src/routes/_staff/integration.tsx`, matching the existing
  outbound IP panel's markup and states.
- No schema change beyond writing into `member_sync_events`.

## PR note

**Summary** — Adds an admin-only ICF credential diagnostic so the nightly sync
failure can be attributed to either a bad stored secret, a wrong login
endpoint, or an invalid/locked account on ICF's side.

**Changes**
- UI: "Check ICF credentials" panel on the Integration page.
- Backend: `checkIcfCredentials` server function + server-only helper that runs
  the Authenticate step in isolation against both candidate endpoints.
- Logging: one `member_sync_events` row per check, outcome only.

**Backend / schema changes** — None (uses existing tables).

**Testing & verification** — Run the check as an admin on the published site
(the runtime the cron uses); confirm the fault text matches the nightly runs,
confirm secret shapes render without any value being shown, and confirm a
non-admin cannot call the function.

**Risks & rollback** — Read-only diagnostic, no writes to member data; revert
is removing the function and the panel.

**Follow-ups** — If ICF reissues the password, update the secret and trigger a
manual sync to confirm recovery.
