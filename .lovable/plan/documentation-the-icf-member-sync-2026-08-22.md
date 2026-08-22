# Documentation: the ICF member sync

Add one new document, `docs/member-sync.md`, that explains the member sync end to
end — the nightly pipeline, the grace period, and what the `/integration` admin
panel does — and connects it to the transport layer already described in
`docs/icf-sync-relay.md`.

Written for both audiences in a single document, matching the house style of the
existing docs: the operator can read the panel and lifecycle sections without the
internals, the engineer gets the pipeline, data model and failure modes.

The relay document stays as it is. The new doc gets a short "How the request
reaches ICF" section that summarises why a fixed-IP relay exists and links to it,
rather than restating it.

## What the document will cover

**1. What the sync is for.** ICF Global's netFORUM membership feed is the source
of truth for who is a member; the chapter site mirrors it and derives everything
else (directory eligibility, member area access, claim rights) from that mirror.
The site never writes membership data back to ICF.

**2. How the request reaches ICF.** The two-step SOAP conversation (authenticate,
then fetch the member feed), the TEST/LIVE endpoint and credential pairs, and the
`X-Relay-Auth` header the app adds when the relay secret is configured. Cross-links
to `docs/icf-sync-relay.md` for the relay itself.

**3. What one run does.** The pipeline in order: open a run record, pull the feed,
run the safety guards, diff each record against the stored one, write creates and
updates with a snapshot of what changed, move members missing from the feed into
the grace period, then reconcile directory visibility. Includes what is written
where, so a wrong-looking member can be traced from run to event to per-member
snapshot.

**4. The safety guards.** Two separate protections, and the difference between
them:

- The **feed drop guard** aborts the run when the feed is more than a set
  percentage smaller than the current *active* population. The baseline is
  active members only — members already moved to grace by an earlier run must
  not count again, or one large correct deactivation would deadlock every later
  run. An admin can override the guard for a single run when a large drop is
  known to be correct; the override is recorded in the run log.
- The **empty feed abort** can never be overridden. A feed that returns nothing
  always aborts without writing.

**5. The grace period.** The lifecycle a member goes through, and why deletion is
never immediate:

```text
active ──(missing from feed)──► grace ──(after the grace window,
   ▲                                      admin runs cleanup)──► anonymized
   └──────(reappears in feed)─────┘
```

Covers: what changes at each step (activity state, the scheduled deletion date,
the lifecycle queue entry, the forced demotion of a published directory profile),
that reappearing in the feed silently restores the member, that the grace window
length is configurable, and that anonymisation clears personal fields rather than
deleting the row so the audit trail survives. Notes that anonymisation only ever
happens when an admin runs the cleanup action — nothing deletes automatically.

**6. The admin panel (`/integration`).** Admin-only. Section by section: the
status card, the email and claim gates and why each button is disabled when it
is, the run/cleanup actions including the drop-guard override, the credential and
outbound-IP diagnostics, and the run history with its expandable per-run detail.
Also states plainly that the drop threshold and the grace window are database
settings today with no field in the UI.

**7. Scheduling and triggering.** The nightly cron job, the dedicated shared-secret
header that protects the endpoint (and why it is not the public key), and the fact
that a sync is skipped outright while a cutover is in progress.

**8. Reading a run when something looks wrong.** A short troubleshooting path:
which run, which events, which snapshot — plus the recognisable failure signatures
(aborted on drop, empty feed, authentication rejected, member missing from the
directory) and where each one points.

## Technical notes

- New file only: `docs/member-sync.md`. No code changes.
- Two small corrections to existing docs, since the new document would otherwise
  contradict them:
  - `docs/operations-and-go-live.md` describes the drop guard as comparing against
    "the previous successful run". It compares against the current active member
    count. That sentence gets corrected and the sync section gains a pointer to
    the new document instead of growing.
  - `docs/code-map.md` gains a reference to the new document from its member data
    section, in the same way the translations and Europe Pulse rows already point
    at their docs.
- The cutover and go-live runbook stays in `docs/operations-and-go-live.md`;
  claim gating and account binding stay in `docs/auth-and-claim-flow.md`. The new
  doc links to both rather than repeating them.
- The document will note that the `inactive` activity state exists in the data
  model but is never written by the current code — the sync only uses active,
  grace and anonymized — so nobody builds logic on a state that never occurs.
- No real member data: any example uses placeholders.

## PR note

**Summary.** Adds a single reference document for the ICF member sync covering the
import pipeline, the member grace period and the `/integration` admin panel, and
links it to the existing relay document. Documentation only.

**Changes.**
- Docs: new `docs/member-sync.md`.
- Docs: corrected drop-guard description and added a cross-link in
  `docs/operations-and-go-live.md`; added a reference row in `docs/code-map.md`.
- Backend / schema: none.

**Testing & verification.** Every behavioural claim in the document is checked
against the current code before it is written; the described state machine,
guard logic, event types and panel actions are read from source rather than from
the older docs. Links between documents are verified to resolve.

**Risks & rollback.** No runtime blast radius — no application code changes.
Rollback is deleting the new file and reverting two doc edits.

**Follow-ups / known debt.** The drop threshold and grace window still have no
admin UI; the document records this as current behaviour rather than fixing it.
