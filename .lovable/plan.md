# Check ICF credentials against LIVE

Today the credential check always uses whichever mode the integration is set to
(currently TEST), so the LIVE account can never be verified before cutover.

## What changes

The panel gets two buttons instead of one:

- "Check TEST credentials"
- "Check LIVE credentials"

Each runs only the ICF login step with that credential set and shows the same
result block as today (outcome, endpoint tried, fault text, and the safe shape
report per secret). The heading of the result already shows which set was used.

Nothing about the integration mode itself changes — checking LIVE does not
switch the site to LIVE, does not touch member data, and does not send email.
It is a read-only login probe.

## Technical notes

- `checkIcfCredentials(actorUserId, mode?)` in
  `src/lib/icf-credentials-check.server.ts` takes an optional mode override;
  when omitted it keeps using `loadIntegrationConfigAdmin().mode`. The override
  only drives which `ICF_SOAP_TEST_*` / `ICF_SOAP_LIVE_*` prefix is read and
  which URL `soapCredentials(mode)` derives.
- The server fn in `src/lib/members.functions.ts` gains an
  `inputValidator` for `{ mode?: "test" | "live" }`, still admin-only.
- UI: `src/routes/_staff/integration.tsx` credential card renders two buttons
  and passes the mode; existing result rendering is unchanged.
- New CMS strings `integration.credCheckTest` / `integration.credCheckLive` in
  all four locales; existing `credCheck` stays for the busy label.
- The audit row written to `member_sync_events` already records the mode, so
  LIVE and TEST checks stay distinguishable in the log.

## PR note

**Summary** — Allows an admin to run the isolated ICF login probe against the
LIVE credential set while the integration is still in TEST mode, so LIVE
access can be verified ahead of cutover.

**Changes**
- UI: TEST / LIVE buttons on the credential check panel; four new locale keys.
- Backend: optional `mode` argument on the credential check server function and
  its server-only helper.

**Backend / schema changes** — None (same `member_sync_events` audit row).

**Testing & verification** — As an admin, run both buttons on the Integration
page and confirm the result header shows TEST vs LIVE, the endpoint host
differs, and secret shapes cover the matching prefix. Confirm the integration
mode on the page is unchanged after a LIVE check, and that a non-admin still
cannot call the function.

**Risks & rollback** — Read-only probe, no writes to member data and no mode
change; rollback is dropping the mode argument.

**Follow-ups** — None; the LIVE cutover flow itself is unchanged.
