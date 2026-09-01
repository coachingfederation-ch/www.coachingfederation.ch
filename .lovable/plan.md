# Member engagement emails driven by sync changes

Four lifecycle emails triggered by what the nightly ICF member sync detects, plus a staff panel to edit the copy, switch each campaign on or off, and review what was sent.

## The four campaigns

| Campaign | Trigger detected in a sync run |
| --- | --- |
| Welcome new member | A member row is created for the first time (separate from, and additional to, the account-claim invitation) |
| Credential level change | `credential_slug` moves ACC → PCC → MCC (upgrade only; downgrades and first-time awards are logged, not emailed) |
| Credential specialisation | ACTC, MCS-ACC, MCS-PCC, MCS-MCC — **built but dormant** |
| Grace period re-engagement | A member drops out of the feed and enters the grace window; offers a conversation with a chapter leader |

Important finding: the ICF feed we receive today carries only one flagship credential per member (ACC, PCC, MCC) and no specialisation tag at all. The specialisation campaign is therefore wired end to end but stays permanently gated off until the feed exposes that field; enabling it in the panel shows an explanatory "no source data yet" notice instead of sending.

## How sending works

- Each campaign has its own switch: **off**, **automatic**, or **queued for review**.
- The sync run detects the change and writes one pending send per member per campaign. Automatic campaigns dispatch immediately after the run; queued ones wait for a staff "Release" click.
- A daily cap per campaign protects against a bad feed turning into hundreds of emails.
- One send per member per campaign per event — a member never gets the same welcome twice, and a re-detected credential change is deduplicated on the from/to pair.
- Everything runs through the existing member email gate: TEST mode and suppression still block or redirect sends, and TEST-shaped addresses are refused.

## Message editing

Staff edit **subject and body text** per campaign in all four chapter languages (DE, FR, IT, EN); layout, branding and footer stay fixed in the template. Members have no stored language preference, so sends use English until one exists — the other three languages are authored now and start being used the moment a preference field lands.

Body copy supports a small set of placeholders (first name, credential from/to, grace end date, a leader-conversation link) with safe fallbacks when a value is missing.

## Admin panel

A new **Member engagement** screen in the staff area:

- One card per campaign: on/off/queued switch, daily cap, last run outcome, counts (pending, sent, skipped, suppressed, failed).
- Copy editor per campaign with a language tab strip and a live email preview.
- Pending queue with member (name + credential change), release and skip actions.
- Send history table with filters by campaign, status and date, showing suppressed and failed rows with their reason.

## Technical notes

- New tables: `member_engagement_campaigns` (one row per campaign: mode, daily cap, per-locale subject/body) and `member_engagement_sends` (member, campaign, trigger detail, status, timestamps, error). Both admin/membership-only under RLS, with grants; no anon access.
- Detection reads `member_import_snapshots` (`change_kind`, `changed_fields`) written by the existing sync, plus the grace transition already recorded in `member_sync_events` — no change to the sync's diffing or upsert logic, only a new post-run step.
- Four React Email templates in `src/lib/email-templates/`, registered in the registry, sent through `sendMemberEmail` so every send lands in `member_email_log` as today.
- Server logic in a new `src/lib/member-engagement/` module (detect, queue, dispatch); admin reads/writes via `*.functions.ts` guarded by the existing staff role check.
- Route: `src/routes/_staff/manage.member-engagement.tsx`, built from design-system components only.

## PR note

**Summary** — Adds four sync-triggered member lifecycle emails with per-campaign send modes, editable multilingual copy, and a staff dashboard for queue and history.

**Changes**
- Backend: campaign + send tables, post-sync detection step, dispatch with daily cap and dedupe.
- Email: four registered templates rendered with staff-authored subject/body.
- UI: new staff route with campaign cards, copy editor, pending queue, send history.

**Backend / schema changes** — Two new tables with RLS and grants; seed rows for the four campaigns (all off by default). No changes to existing member or sync tables.

**Testing & verification** — Detection verified against recent snapshot rows without sending; dispatch verified in TEST mode (suppressed/redirected) before any live enable; dedupe verified by re-running detection on the same run.

**Risks & rollback** — Blast radius is limited by campaigns shipping switched off and by the daily cap. Rollback is switching campaigns off; the tables are safe to leave in place if code is reverted.

**Follow-ups / known debt** — Specialisation campaign dormant until ICF exposes the field; per-member language preference not yet stored, so non-English copy is authored but unused.
