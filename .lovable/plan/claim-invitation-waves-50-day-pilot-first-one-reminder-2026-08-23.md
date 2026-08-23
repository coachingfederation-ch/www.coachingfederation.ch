# Claim invitation waves (50/day, pilot first, one reminder)

## Your two questions, answered from the code

**1. LIVE with both gates closed = sync only. Correct.**
The cutover routine switches `mode` to `live` and in the same write sets
`emails_suppressed: true` and `account_claim_enabled: false`. The only code path
that sends member email is the claim invitation; the sync engine itself sends
nothing. `/claim` shows the "not open yet" notice and `/auth` hides the entry
point while the flag is false. So you can run LIVE for days, watch sync runs,
counts and audit events, and no member is contacted.

**2. Wave sending: not built.** Today an invitation is sent one member at a time
by staff from `/members/$id`. There is no batch job, no daily cap, no reminder
schedule. That is what this plan adds.

## What gets built

A claim campaign with a bounded daily job plus a manual release button.

**Campaign state (one row).** Status (`idle` / `running` / `paused` /
`completed`), daily cap (default 50), reminder toggle (default on, 7 days),
last run date, counters, and the reason it paused. Nothing sends while the
status is not `running`, and nothing sends at all unless the integration is
LIVE, `emails_suppressed` is false and `account_claim_enabled` is true — the
same three-part gate the claim flow already uses. In TEST the screen shows why
the campaign cannot start instead of failing on click.

**Who is eligible.** Active members with a real email, no linked account, and no
test-shaped (`zz`) address — the existing `invitationBlockReason` rules, reused
so the batch and the single-send button can never disagree.

**Ordering.** Wave 1 is the pilot group: members staff explicitly mark as pilot
on `/members` (a small "pilot" toggle, stored in its own table so a sync never
overwrites it). Once the pilot list is exhausted the job continues with everyone
else, oldest join date first.

**Daily cap.** 50 by default, editable on `/integration`. Reminders count
against the same cap, and are sent before new invitations so nobody waits behind
a growing queue.

**Reminders.** One reminder per member, 7 days after the first invitation, only
if the account is still unclaimed. It mints a fresh token (the old one has just
expired) through the existing `deliverClaimInvitation`, which already supersedes
prior links.

**Manual release.** A "Send next wave now" button runs exactly one batch
immediately and records it as that day's run, so the scheduled job does not
double-send.

**Staff screen.** A Claim campaign card on `/integration`: progress
(invited / claimed / remaining), today's sends, next scheduled run, cap and
reminder controls, start / pause / resume, and the manual release button. Each
disabled control states its reason.

## Safety properties

- Bounded work per run (the cap) and a single-flight lease so an overlapping run
  exits instead of doubling a wave.
- Every send is recorded before the next item is processed, so a retry resumes
  rather than repeats; the existing token-scoped idempotency key already dedupes
  a retried send.
- Any email failure pauses the campaign and surfaces the error on the card.
- Never runs while a cutover is in progress, mirroring the sync endpoint.

## Technical notes

- New tables: `member_claim_campaign` (single-row config + state, admin-only
  read/write, service_role full) and `member_claim_pilot` (member ids for
  wave 1). Both with grants, RLS and admin policies.
- New server route `src/routes/api/public/claim-waves.ts`, authorised with the
  existing `isAuthorisedCronRequest` helper, scheduled daily at 09:00 Zurich via
  pg_cron + pg_net.
- Batch logic in `src/lib/member-claim/waves.server.ts`, calling the existing
  `deliverClaimInvitation`; invitation history is read from
  `member_profile_links` and `member_email_log`, so no duplicate bookkeeping.
- Admin server functions (start / pause / resume / update cap / release now /
  set pilot) in `src/lib/members.functions.ts`, all role-checked.
- UI in `src/routes/_staff/integration.tsx` and the pilot toggle in the members
  list; new keys in the four `cms.json` locales.

## PR note

**Summary** — Adds a rate-limited claim invitation campaign so member accounts
are opened in waves of 50 a day, pilot group first, with one automatic reminder,
instead of staff sending invitations one by one.

**Changes** — DB: campaign state and pilot list tables. Backend: daily cron
route, batch engine with cap, lease, gating and circuit breaker, admin server
functions. UI: campaign card on `/integration`, pilot toggle on `/members`,
i18n for DE/FR/IT/EN.

**Backend / schema changes** — Two new tables with grants and admin-only RLS;
one pg_cron schedule. No change to the existing gates, triggers or claim token
model.

**Testing & verification** — In TEST: campaign refuses to start and states why.
With emails redirected to a test inbox: a manual release sends exactly the cap,
a second immediate release is refused, reminders fire only for unclaimed
invitations after 7 days, and a failed send pauses the campaign.

**Risks & rollback** — Blast radius is member email. Mitigated by the three-part
gate, the cap, the pause-on-error breaker and the redirect inbox. Rollback is
setting the campaign to paused; the tables can stay.

**Follow-ups** — No per-language send-window tuning and no bounce-driven
auto-suppression beyond what the email provider already applies.
