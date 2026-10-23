# Member votes

Staff (Membership & Engagement, Administrators, Super Admins) publish a proposal; signed-in active or grace members cast one secret vote during a window and may add an anonymous reason.

## Screens

- Member Area: `/member/votes` (Open / Upcoming / Closed tabs), `/member/votes/:slug` (proposal, downloads, ballot, results, reasons wall). The member home shows a banner while an open vote is unanswered.
- CMS: `/manage/votes` (list, create), `/manage/votes/:id` (text in EN/DE/FR/IT, window, options, results visibility, reason on/off, announcement emails, downloads), `/manage/votes/:id/results` (turnout, tally, votes per day, reasons with hide/show, AI theme summary, CSV export).
- Feature switch: Integration → Features → Member votes (`integration_config.feature_votes_enabled`, read via `feature_flags()`).

## Secrecy design

| Table | Holds | Who can read |
|---|---|---|
| `vote_participations` | vote, member, day voted. No choice. | the member (own rows), vote managers |
| `vote_ballots` | vote, option, reason, receipt, day. No member. | vote managers only |

Both rows are written only by `cast_vote()` (security definer), which checks: linked member in `active`/`grace`, vote `published`, inside the window, valid option, reason at most 500 characters, and not already voted (primary key). Only the day is stored, so ballots cannot be matched to participations by time.

Participation ownership is checked through `private.owns_vote_participation(member_id)`, a caller-bound security-definer boolean. The policy must not directly query `members.auth_user_id`: that private column is intentionally unavailable to Data API callers. Managers retain read access; members see only participation linked to their own account. No member-column grants are widened.

Regression checks: `src/lib/votes-access.test.ts` checks the deployed private-column grant, anonymous helper denial, caller-bound ownership predicate, and participation policy (requires `SUPABASE_DB_URL`). The sandbox SQL role cannot impersonate authenticated roles, so these are access-contract checks rather than cross-member behavioral tests. The original staff list error was reproduced in the authenticated browser; after migration `0017_fix_vote_participation_ownership.sql`, the list and existing vote editor loaded successfully. Cross-member browser isolation remains unverified.

Members read results only through `vote_tally()` and `vote_rationales()`, which return data when the caller is a vote manager, or the vote has closed, or the caller voted and `results_mode = 'after_vote'`.

Once a published vote has opened, `saveVote` refuses option or start-date changes and only allows extending the end date. Only drafts can be deleted.

Turnout denominator: `votes.eligible_count`, frozen on the first ballot (active + grace members with a linked account).

## Files

Downloads live in the private `vote-files` bucket under `<vote id>/…`. Managers upload; members get one-hour signed links from `getMemberVote`.

## Emails

`/api/public/member-votes` runs hourly (pg_cron `member-votes-hourly`, cron token). For each open published vote with announcements on, it sends the announcement once (`announced_at`) to all active/grace members with a linked account, and one reminder 3 days before close (`reminded_at`) to members without a participation row. Sends go through `sendMemberEmail` with the `member-engagement` template, so TEST-mode suppression applies. Copy is in `src/lib/votes.server.ts`.

## Code

- `src/lib/votes.ts` – phase, default window, helpers (tests in `votes.test.ts`)
- `src/lib/votes.functions.ts` – server functions
- `src/lib/votes.server.ts` – cron emails
- Migrations `0015_member_votes.sql`, `0016_member_votes_flags_storage_cron.sql`

## Known gaps

- Single choice only; no ranked or multi-select voting, no quorum rules.
- Privacy policy section for votes still needs approved wording.
- DE/FR/IT interface and email copy is machine-written; native review advised.
