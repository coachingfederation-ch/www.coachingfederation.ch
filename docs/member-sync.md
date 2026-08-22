# The ICF member sync

ICF Global's netFORUM membership feed is the source of truth for who is a member
of the chapter. This site mirrors that feed into the `members` table and derives
everything else from the mirror: who may appear in the public coach directory, who
can reach the member area, and who may claim an account.

The sync is one-directional. Nothing this site does is ever written back to ICF.
Membership facts — name, email, member type, credential, join and expiry dates —
are read-only here and change only when ICF changes them.

Related documents:

- `docs/icf-sync-relay.md` — the fixed-IP relay that carries the traffic to ICF.
- `docs/operations-and-go-live.md` — cron schedule, the cutover runbook, incident
  response.
- `docs/auth-and-claim-flow.md` — account claim, role model, member ↔ account
  binding.

---

## 1. How the request reaches ICF

Each run is a two-step SOAP conversation with netFORUM xWeb
(`src/lib/icf-soap.server.ts`):

1. **Authenticate** against the open endpoint. The session token comes back in a
   SOAP _header_ (`AuthorizationToken`), not in the response body.
2. **ExecuteMethod** against the `/secure/` endpoint, carrying that token, calling
   the chapter method that returns every individual with a chapter relationship.

There are two complete sets of credentials, selected by the integration mode:
`ICF_SOAP_TEST_*` and `ICF_SOAP_LIVE_*`, each with a base URL, username, password
and customer key. The base URL is normalised, so both the open and secure endpoint
paths are derived from the one value.

ICF only accepts requests from a whitelisted IP, and this app has no stable
outbound IPv4 address. All traffic therefore goes through a small reverse proxy
with a fixed address. When `ICF_RELAY_AUTH` is set, every SOAP request carries it
as an `X-Relay-Auth` header; without the variable the header is simply omitted, so
the same code works with or without the relay. **The relay, its access control and
the header-forwarding pitfall are documented in `docs/icf-sync-relay.md`.**

Each feed record is normalised into a fixed shape keyed on `cst_recno`, the ICF
record number. `cst_recno` is the join key for the entire pipeline — never the
email address. Every optional field defaults to `null`, so a tag that disappears
from the feed clears the stored value instead of silently leaving stale data
behind. Tags that the app does not model are kept in a diagnostics blob rather
than discarded.

> **TEST addresses.** ICF's TEST environment wraps email addresses in `zz`
> (`zzanna.muster@example.comzz`). A TEST-shaped address is permanently barred
> from claiming an account, whatever mode the integration is in. See
> `docs/auth-and-claim-flow.md`.

---

## 2. What one run does

`runMemberSync` in `src/lib/member-sync.server.ts`, in order:

1. **Open a run record** in `member_sync_runs` with status `running`, the current
   mode, and who or what triggered it. The outbound IP is recorded for support
   requests to ICF.
2. **Pull the feed.**
3. **Run the safety guards** (section 3). A guard trip ends the run as `aborted`
   with nothing written.
4. **Diff** each feed record against the stored row across the imported fields
   only — name, email, phone, city, country, organisation, credential, member
   type, and the membership and credential dates. A record with no stored
   counterpart is a create; anything else is an update only if a field actually
   differs.
5. **Write creates and updates** in chunks, upserting on `cst_recno`. Every
   changed member also gets a row in `member_import_snapshots` holding the full
   normalised payload and the list of fields that changed. Unchanged members write
   nothing, which keeps the audit trail readable.
6. **Move missing members into the grace period** (section 4).
7. **Reconcile the directory.** Every active member without a directory profile
   gets an empty draft one. Every profile is then re-checked against the
   eligibility rules: profiles that lost eligibility are demoted, and profiles the
   system hid earlier are restored to draft once they qualify again. A profile
   hidden by an administrator is never touched.
8. **Close the run** as `succeeded`, `aborted` or `failed`, and mirror the outcome
   onto the integration record so the panel can show the last success, the last
   failure and its message without scanning history.

Three tables make every run auditable after the fact:

| Table                     | Holds                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| `member_sync_runs`        | One row per run: status, counts, trigger, error message.                       |
| `member_sync_events`      | The narrative of a run: what it decided and why, with a severity.              |
| `member_import_snapshots` | One row per changed member per run: what the feed said and which fields moved. |

Events carry a severity and a type. The ones worth recognising:

| Event                                                            | Severity       | Meaning                                    |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------ |
| `feed_drop_abort`                                                | error          | The drop guard stopped the run.            |
| `feed_drop_override`                                             | warning        | An admin ran the sync past the drop guard. |
| `empty_feed_abort`                                               | error          | The feed returned nothing.                 |
| `member_deactivated`                                             | warning        | A member entered the grace period.         |
| `directory_visibility_demoted` / `directory_visibility_restored` | warning / info | A profile lost or regained eligibility.    |
| `directory_profiles_created`                                     | info           | Draft profiles created for new members.    |
| `member_anonymized`                                              | warning        | A grace member was anonymised by cleanup.  |
| `sync_failed`                                                    | error          | The run threw.                             |

---

## 3. The safety guards

A membership feed that silently returns too little is the most dangerous failure
this system has: without a guard, one truncated response would deactivate the
whole chapter in a single pass and demote every public profile. There are two
guards, and the difference between them matters.

### The feed drop guard

If the feed is more than `feed_drop_threshold_pct` smaller than the current
**active** member count, the run aborts without writing anything.

The baseline is deliberately the active population, not every member on record.
Members already moved to grace by an earlier run were legitimately deactivated;
counting them again would make each large-but-correct drop permanent — the feed
would look "too small" forever and every subsequent run would abort. Measuring
against active members only means the guard reacts to _new_ loss.

An admin can run one sync past this guard from the panel, for the case where a
large drop is known to be correct. The override is written into the run log as a
warning with the numbers that triggered it, so the decision is visible later. Cron
can never set it.

### The empty feed abort

A feed with zero records always aborts, and the override does not apply. An empty
response is never a legitimate membership state; it is a broken call.

---

## 4. The grace period

Membership lapses and renewals are routine, and administrative gaps happen.
Deleting a member the moment they fall out of the feed would destroy
member-authored profile content over a gap that resolves itself a week later. So
disappearance from the feed starts a clock instead of a deletion.

```text
                 missing from feed
   active  ─────────────────────────────►  grace
      ▲                                      │
      │        reappears in feed             │  grace window elapses,
      └──────────────────────────────────────┤  admin runs cleanup
                                             ▼
                                        anonymized
```

**Entering grace.** When an active member is not in the feed, the sync sets their
activity state to `grace`, records when they went inactive, and stamps a scheduled
deletion date at `grace_period_days` from now. A lifecycle queue row is written for
tracking, and any _published_ directory profile is immediately demoted so a lapsed
member never stays visible in the public directory during the window. The member
row and all their authored content stay untouched.

**Coming back.** Reappearing in the feed restores the member with no manual step:
the upsert unconditionally sets the state back to active and clears both the
inactive date and the scheduled deletion. Their directory profile becomes eligible
again on the same run's reconciliation pass.

**Anonymisation.** Once the scheduled date has passed, an admin can run the cleanup
action. It clears the personal fields — names, email, phone, city, country,
organisation — releases the link to any login account, sets the state to
`anonymized`, and closes the lifecycle queue entry. The row itself survives, so
sync history and content authorship remain coherent.

Two things to be clear about:

- **Nothing deletes automatically.** Anonymisation only happens when an admin runs
  cleanup. An expired grace period is a to-do, not a scheduled job.
- The data model also has an `inactive` state, but no code path writes it today.
  The sync uses `active`, `grace` and `anonymized` only. Do not build logic that
  waits for `inactive`.

`grace_period_days` and `feed_drop_threshold_pct` both live on the integration
record and have no field in the admin UI today; changing them is a database edit.

---

## 5. The admin panel (`/integration`)

Admin only. Everything below is one screen.

**Status.** Current mode (TEST or LIVE), whether a cutover is in progress, whether
member email is suppressed and whether account claiming is open, the timestamps of
the last successful and last failed sync with its error message, and the email
redirect address, editable inline.

**Gates.** Two switches with deliberate friction: open or close member email
sending, and open or close account claiming. Each button explains why it is
disabled when it is. These mirror rules that the database enforces regardless of
what the UI does — TEST mode can never send member email and can never open
claiming, claiming cannot open before a recorded LIVE cutover, and LIVE can never
be switched back to TEST. See `docs/operations-and-go-live.md`.

**Actions.**

- _Run sync now_ — a normal manual run, all guards active.
- _Run sync, ignore drop guard_ — behind a confirmation, for a known-correct large
  drop. Logged as an override; never skips the empty-feed abort.
- _Clean up_ — anonymises grace members whose scheduled deletion date has passed.

**Diagnostics.** A credential check that performs the authenticate step in
isolation, so a credential or whitelist problem can be separated from a feed
problem, and an outbound IP report for the whitelisting conversation with ICF.

**Cutover and rehearsal.** Shown only before the cutover has been recorded. The
rehearsal reports what a cutover would do and changes nothing; the real cutover
requires typing a confirmation word and is irreversible. The runbook is in
`docs/operations-and-go-live.md`.

**Run history.** The ten most recent runs with status, feed size and the created /
updated / deactivated counts. Each row expands into the per-member detail for that
run and its full event log.

---

## 6. Scheduling and triggering

A nightly cron job posts to `/api/public/member-sync`. Two things protect it:

- The endpoint requires a dedicated shared secret in the `x-cron-token` header,
  compared in constant time. It is deliberately **not** the public API key — that
  key ships to every browser, so anyone could otherwise trigger a full ICF re-sync.
  The token exists only in the server environment and in a private config table
  that the cron job reads; rotate both together.
- If a cutover is in progress, the run is skipped immediately and reports why. A
  sync must never race a cutover.

Manual runs from the panel go through an authenticated admin server function, not
this endpoint. Schedule and job names are in `docs/operations-and-go-live.md`.

---

## 7. When something looks wrong

Work from the run outward: the most recent `member_sync_runs` row, then
`member_sync_events` for that run, then `member_import_snapshots` for the specific
member. The panel's expandable run history shows all three without a query.

| Symptom                                           | Where to look                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run aborted, "feed returned N members, X% below…" | The feed genuinely shrank, or it was truncated. Compare against the previous run's feed count. Use the override only once you are satisfied the drop is real.          |
| Run aborted on an empty feed                      | Not a membership event. Check credentials and the relay — start with the credential diagnostic.                                                                        |
| "Invalid credentials supplied"                    | Usually the source IP, not the password: the relay must present its own address and strip forwarded-IP headers. See `docs/icf-sync-relay.md`.                          |
| A member vanished from the public directory       | Check their activity state. `grace` means they were missing from the feed and their profile was demoted; a published profile is also demoted when a credential lapses. |
| A member is back with ICF but still hidden        | They are restored on the next run. Trigger a manual sync rather than editing the row.                                                                                  |
| One field looks stale                             | The snapshot for that member and run shows exactly what the feed sent and which fields changed. If the field is not in the imported set, the sync does not own it.     |

---

## 8. Boundaries

- The sync owns membership facts. It never owns member-authored content —
  biography, service areas, languages, photo — which is written by the member and
  survives deactivation.
- The sync decides _eligibility_ for the public directory; it never publishes on a
  member's behalf. See `docs/public-directory.md`.
- Claiming and account binding are a separate flow with their own gating. See
  `docs/auth-and-claim-flow.md`.
