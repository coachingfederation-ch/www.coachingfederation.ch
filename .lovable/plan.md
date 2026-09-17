# Protecting member data when ICF stops sending it

From 10 September (test) and 13 October (live), ICF only sends full details for members
who have an explicit GDPR opt-in on record. Everyone else arrives as first name and last
name only — no email, no member number, no membership or credential dates.

Today the sync treats the feed as the complete truth: a record that arrives without a
member number is discarded, and a member who is missing from the feed is deactivated,
loses their public profile, and is eventually anonymised. Without a change, opted-out
members would silently lose their sign-in address and their account.

## Step 1 — Confirm what an opted-out record actually contains

Before any code changes, run one read-only call against the ICF test feed and record, in
the sync log, how many records arrive complete, how many arrive name-only, and whether a
name-only record still carries the member number. Everything below is designed for the
worst case (no member number), but the answer decides how precisely we can match those
records to the people we already hold.

## Step 2 — Freeze instead of delete

New rule: a member disappearing from the feed is no longer automatically treated as
"membership ended".

- Stored details (email, phone, dates, credential) are never overwritten with blanks by a
  partial record. The last confirmed values stay exactly as they are.
- A member we can no longer confirm is marked **consent withheld**: still active, still
  able to sign in, still listed in the directory, but flagged on their record and on the
  integration screen with the date we last had confirmation.
- The existing grace/deletion lifecycle only starts for members ICF actively reports as
  ended — not for members who merely went quiet because of their privacy setting.
- The feed-drop safety guard is measured against *confirmed* members only, so the
  October changeover does not abort every run.

## Step 3 — Tell affected members, with a 90-day clock

A new Member Engagement campaign, "Privacy setting — profile at risk", goes to members in
the consent-withheld state: it explains that ICF no longer shares their details with the
chapter because of their privacy setting, that we will remove their chapter profile after
90 days, and how to restore the opt-in in their ICF profile (one link). Reminder at 30
days remaining, final notice at 7 days. Restoring the opt-in clears the state and cancels
the clock automatically at the next sync. As with every campaign, it starts switched off
and staff release it.

Removal after 90 days follows the existing clean-up: the profile and contact data are
removed, staff see the pending list beforehand and can extend or exempt individuals.

## Step 4 — Onboarding when we never receive an email

Two routes, working together.

**A. Ask members to opt in at ICF (primary).** A short public page plus the campaign above
walk a member through switching their ICF privacy setting on. Once they do, their address
flows in on the next sync and the normal invitation follows. Nothing to verify on our
side — ICF has already confirmed the address.

**B. Self-service with verification (fallback).** A member who does not want to change the
ICF setting, or who needs access sooner, fills in a short form: ICF member number, last
name, and the email address they want to use. We never say whether the combination matched
— the answer is always the same neutral message. If it matches a member record we hold,
a confirmation link goes to the address they entered; clicking it only proves they own the
mailbox. The request then lands in a staff queue on the members screen, showing the
matched record, and access is only granted when staff approve. Rate limited by address and
by member number, every attempt logged, no data about the member is ever shown before
approval. Approving issues the normal invitation link — so the existing claim flow stays
the single way into the member area.

Not chosen: letting a form bind an account automatically on member number plus last name.
Both are effectively public information, so that would let a stranger take over an account.

## Technical notes

- `src/lib/icf-soap.server.ts`: keep name-only records instead of dropping them; report
  them separately as "redacted" so the sync can act on them.
- `src/lib/member-sync.server.ts` / `member-sync/snapshots.server.ts`: partial records
  never blank stored fields; absence no longer routes straight into grace; drop guard
  counts confirmed records only.
- New member state and dates (consent withheld, since, deadline) via migration on
  `members`, plus queue rows reusing `member_lifecycle_queue` semantics.
- New campaign keys and localized templates (DE, FR, IT, EN) in the existing engagement
  registry; new claim-request table with staff-only access for route B.
- Docs updated in the same change: `docs/member-sync.md`, `docs/auth-and-claim-flow.md`,
  `docs/operations-and-go-live.md`.

## PR note

- **Summary** — Protect already-synced member data against ICF's GDPR-gated feed, and add
  two onboarding routes for members whose address we never receive.
- **Changes** — SOAP parsing, sync freeze logic, new member state, engagement campaign
  with 90-day clock, opt-in guidance page, verified claim-request form plus staff queue.
- **Backend / schema** — New columns on `members`, new claim-request table with RLS and
  grants, no destructive changes.
- **Testing** — Test-feed diagnostic run; simulated runs with complete, redacted and
  missing records; campaign dry run; claim-request flow including wrong member number and
  rate limiting.
- **Risks & rollback** — Freeze is conservative (keeps more data than before); the clock
  only removes data after staff-visible warnings. Revertable per step.
- **Follow-ups** — Decide whether directory listings should show a "details not confirmed
  by ICF" marker once the first real redacted run is observed.
