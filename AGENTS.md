<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Personal data hygiene

Never put real member data into files that live in this repository — plans
(`.lovable/`), docs, migrations, code comments, or commit messages. That
includes names, private email addresses, phone numbers, ICF member numbers
(`cst_recno`) and account ids. When illustrating a screen that displays member
records, use obvious placeholders (`Anna Muster`, `anna.muster@example.com`,
`ICF 000000`). The only address that may appear verbatim is the chapter's
public `office@coachingfederation.ch`.

Live member data belongs in the database, behind RLS — not in version control.

- Stripe runs through the built-in payments connection (gateway, createStripeClient(env)); Test/Live picked by VITE_PAYMENTS_CLIENT_TOKEN and payment_environment. Why: the chapter switched to the console Payments setup with a Test/Live toggle.
- External advertisers are auth accounts with the `advertiser` role plus an `advertiser_profiles` row, granted only via the `complete_advertiser_onboarding` RPC; never rows in `members`. Why: synced member data stays authoritative and advertisers never reach the Member Area.
- Feature switches live on integration_config and are read publicly only through feature_flags(). Why: keeps the rest of the config row admin-only.
- Operational assignment history is captured by a database trigger and read through the caller's RLS-bound client; only platform admins can read it. Why: every assignment write is traceable without exposing private history or coupling volunteer positions to staff access.
- Custom forms are a standalone module (library `form_templates` + one `FormBuilder`); events receive a copy into `event_forms`, never a live link. Why: editing a reusable form must not change past events or their answers.
- Public surveys live in `surveys`/`survey_responses` with staff-only RLS; anonymous reads and submits go only through rate-limited server functions that check `surveyAvailability()` first. Why: no anon table access to answers.
- Attendance QR display tabs reuse the staff check-in route with an optional projector search flag; reserve the tab synchronously before opening a session. Why: preserves desk access and staff authorization without creating duplicate sessions or triggering popup blockers.
- The board digest is one email to one configured group mailbox, built by reusing the Overview and assistant-insights aggregations, sent by an hourly cron that defers to `isDigestDue`. Why: app emails go to one recipient per send, and the email must never disagree with the dashboards.
- Board digest presentation composes the existing AuthEmailShell; keep reporting content separate from shared email chrome. Why: header and footer branding stays consistent without duplicating email-client-specific styles.
- Member votes keep who-voted (`vote_participations`) and what-was-voted (`vote_ballots`) in separate tables with no link and day-only dates, written only by `cast_vote()`; members see tallies and reasons only via `vote_tally`/`vote_rationales`. Why: ballots must stay secret even from staff.
- Vote-participation RLS uses a private caller-bound ownership helper, never a direct read of `members.auth_user_id`. Why: member linkage is intentionally excluded from Data API column grants.
- Staff vote previews reuse the member-page renderer and require the vote-manager guard for draft reads; preview mode never submits ballots or returns results. Why: previews match the member experience without changing eligibility or revealing ballots.
- Vote translation is a manager-only, rate-limited draft transformation; localized option labels stay inside the existing options JSON and preserve keys and the existing post-opening freeze. Why: translation must not change vote meaning, tally identities, or publishing state.

- Ballot questions are nullable localized vote fields; suggestions transform buffered proposal text without saving, and all question languages freeze at voting start in server validation and the database. Why: staff can refine drafts without changing the question already answered by members.
