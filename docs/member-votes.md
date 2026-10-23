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

## Editor and translation

The Ballot tab starts with an editable ballot question. “Suggest from proposal” extracts one neutral English question from buffered title, summary, description, and choices through Lovable AI. It requires proposal text and never saves or publishes; replacing an existing question requires confirmation. Staff refine the suggestion, translate, and save. The question appears above member choices and in confirmation, including saved staff previews. Empty legacy questions retain the previous ballot display.

Question fields (`ballot_question`, `_de`, `_fr`, `_it`) are nullable, with a 600-character limit. The same vote-manager guard protects suggestions, limited to 20 per hour. Server validation and the database trigger in `0018_vote_ballot_question.sql` freeze every language version once published voting starts, including direct writes and concurrent opening. Existing RLS and ballot secrecy remain unchanged.

The editor has Proposal, Ballot, and Publishing tabs and a shared DE / FR / IT / EN language selector. Proposal uses the existing `MarkdownEditor`; the member page and staff preview render the same safe Markdown. Downloads stay with Proposal, options and rationale settings with Ballot, and schedule, status, and email controls with Publishing. Compact navigation applies only to this editor on narrow screens.

Translate to DE, FR, IT translates the current English draft, including title, summary, description, ballot question, and option labels, in one authenticated, manager-only action (20 requests per hour). Translation never saves or publishes. Existing translations require overwrite confirmation; failures preserve all buffered edits. Review machine translations, then use Save. English fallback remains available for missing labels.

`VoteOption` keeps `key` and English `label`, plus optional `label_de`, `label_fr`, and `label_it` within the existing JSON column. No schema or RLS changes are needed. Validation checks that every translated option key matches the source; labels are merged by key, not position. Existing post-opening option freezing also covers translated wording. Member ballots, confirmation, results, rationale headings, and staff CSV labels use the selected language; AI rationale summaries remain English.

### PR note

- Summary: reorganizes the editor around writing, ballot setup, and publishing while reusing formatting tools and adding coordinated translation.
- UI: three sections, shared languages, read-only preview retained, save/translation feedback, compact editor navigation on phones.
- Backend/schema: one guarded draft-translation server function; optional labels in existing JSON validation; no migration or permissions change.
- Testing: 20 tests passed. A temporary draft was translated through the real AI connection, saved, reloaded, and previewed with rendered Markdown. Desktop and phone screenshots verified the layout; phone inputs retain usable width and navigation opens as a drawer. The temporary draft was deleted. Full contrast and assistive-technology review remains pending.
- Risks/rollback: additive labels remain safe for old consumers; revert editor/rendering and translator changes to restore the previous flow. Machine translations need review.
- Follow-ups: automatic stale-translation detection is not implemented.

## Staff preview

The editor's Preview link opens `/manage/votes/preview/:slug` in a new tab. It displays the saved proposal, translations, downloads, and ballot using the same `VotePage` renderer as the Member Area. Save edits before previewing. Draft access requires the same server-side vote-manager check as the editor, even for a direct preview request. Preview voting is disabled and the submit handler is guarded; no tally or rationales are returned in preview mode. Normal member access and voting rules are unchanged.

Verified with a signed-in vote manager: the link opened a separate tab, saved draft content appeared, and selecting an option left the vote-submit button disabled. Existing voting and database access-contract tests passed. Attachment downloads and cross-role preview denial have not been browser-tested.

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
