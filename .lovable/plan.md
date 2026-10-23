# Member Votes: proposals, secret ballots and anonymous rationale

## Goal
Staff can publish a proposal (description, attachments such as a slide deck, voting window). Only signed-in active members can vote once, during the window. Members may add an optional rationale. Votes are secret; rationales are shown anonymously, and only after the member has voted.

## Assumptions (please confirm or correct)
- Choices: Yes / No / Abstain by default. Staff can switch to custom options (for example Project A, B, C), with one choice per member.
- Voting window: staff set start and end dates. The default is 30 days from the first of next month.
- Who can vote: members whose account is linked and active when they vote. Grace members can vote too.
- Location: inside the Member Area. There is no public page in this first version.
- Results: members see the live tally only after they vote or the vote closes. Staff can choose "results hidden until close".
- Announcements: an email goes to all active members when the vote opens, plus one reminder 3 days before close. The announcement can be switched off.

## Member experience
- Member home shows a card listing open votes, with "Vote now" or "You voted" and days left.
- Proposal page `/member/votes/$slug`:
  - Title, category, status, and voting window in Zurich time.
  - Rich description and downloadable attachments (PDF, slides).
  - A ballot with radio options, an optional rationale field (500 characters), and a confirmation step. A vote cannot be changed after submitting.
  - After voting, the page shows a confirmation with a receipt code, the live tally (if allowed), and a rationale wall.
- Rationale wall: anonymous cards grouped by chosen option (pro / con / abstain columns), with no names, newest first. An AI summary of the main themes per side can be added (see staff).
- List page `/member/votes` with Open, Upcoming and Closed tabs.

## Staff experience (CMS, new "Votes" section; admin, administrator and membership roles)
- List of votes with status: draft, scheduled, open, closed, archived.
- Editor: title, slug, category, description, options, window, results visibility, rationale on/off, attachments upload, translations (EN, DE, FR, IT, reusing the existing translation pattern), and the announcement email toggle.
- Publishing locks options and the window start once the vote has started. Staff can only extend the end date.
- Results page:
  - Turnout as "X of Y eligible members voted (Z%)", with eligibility counted at open time.
  - Tally per option and votes per day.
  - Rationales list with an AI theme summary (Lovable AI), generated on demand.
  - Export to CSV of tally and anonymous rationales, with formula-safe escaping. Voter identities are not exported.
- Moderation: staff can hide an abusive rationale. The vote itself stays counted.

## Secrecy design
- Two separate records:
  - `vote_participations`: who voted, used only to block double voting and count turnout. It holds no choice.
  - `vote_ballots`: the choice and the rationale, with no member reference, only a random receipt code. Its timestamp is rounded to the day so ballots cannot be matched by time.
- Both are written in one database function (`cast_vote`). It checks membership, the window and that the member has not voted yet, so neither table can be written directly.
- Staff can read ballots and participations, but cannot join them to each other.

## Technical details
- Migration (tables with GRANTs, RLS and policies):
  - `votes`: status, window, options as JSONB, settings, created_by.
  - `vote_translations`.
  - `vote_attachments`, stored in a private storage bucket `vote-files` and served to members through signed URLs from a server function.
  - `vote_participations`: vote_id, member_id, unique (vote_id, member_id).
  - `vote_ballots`: vote_id, option_key, rationale, hidden, receipt, cast_on date.
  - `vote_eligibility_snapshots`: the turnout denominator.
- RLS:
  - Members read published votes in the Member Area.
  - No member SELECT on ballots. Aggregates and the rationale wall come through security-definer functions (`vote_tally`, `vote_rationales`). These return data only if the caller participated, or the vote is closed and results are allowed.
- Server functions in `src/lib/votes.functions.ts` use `requireSupabaseAuth` plus the existing role guards (`assertMembership`). Member actions call the `cast_vote` RPC through the caller's own client.
- Emails reuse the transactional email setup. The open and reminder emails run from an hourly cron route under `/api/public/` with token auth and the rate limits that already exist.
- Status changes (scheduled to open to closed) are computed from dates, so no job is needed for them.
- Tests:
  - `cast_vote` rules: outside the window is rejected, a second vote is rejected, non-members are rejected.
  - The tally is hidden before voting.
  - CSV escaping.
- Docs: `docs/member-votes.md`, plus updates to the architecture and code map, and an AGENTS.md rule on ballot separation.
- Privacy policy: add a section on votes (secret ballot, anonymous rationale, retention). The text will be drafted for your approval before it is published, as with surveys.

## PR note
- **Summary:** Adds member votes with secret ballots, optional anonymous rationale and staff results, so the board can consult members on larger decisions.
- **Changes:**
  - UI: Member Area list and proposal pages, home card, staff Votes section with editor and results.
  - Backend: six tables, the `cast_vote`, `vote_tally` and `vote_rationales` functions, the storage bucket, the email cron, and the AI summary.
- **Backend / Schema:** New tables and functions only. No changes to existing tables.
- **Testing:** Unit tests on the voting rules, an end-to-end vote as a member test account, and a staff create, publish and results flow.
- **Risks & Rollback:** The feature is isolated and sits behind a new feature flag in `feature_flags()`. The code can be reverted and the tables left in place unused.
- **Follow-ups:** Ranked or multi-select voting, quorum rules, a public results page, and voting by guest or non-member accounts.
