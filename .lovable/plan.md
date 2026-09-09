# One home for email wording: Cloud → Emails

Right now member wording lives in two places: the four engagement campaigns are
edited on the Member engagement screen and stored in the database, while every
other email is a fixed template previewed under Cloud → Emails. That split is
the confusion.

This change moves all four campaign texts into the same template set as the rest
of the emails, so **Cloud → Emails is the single place to see every message the
chapter sends**. The Member engagement screen stays — but as a control and
traffic screen, not a text editor.

## After the change

**Cloud → Emails → App emails** lists all member emails, each with its own
preview: welcome, credential upgrade, specialisation, grace re-engagement, the
two grace warnings, the claim invitation, and the existing event/newsletter
messages. Wording changes are made in the project (ask, and the text is
changed), exactly as with every other email today.

**Member engagement dashboard** keeps everything operational:

- per campaign: off / automatic / queued for review, and the daily cap,
- the pending queue with release and skip,
- the send history with status, reason and language,
- a preview link per campaign so staff can see the current text.

The copy editor, the language tab strip and the translate button disappear from
that screen.

## Languages

Each campaign gets its four language versions (DE, FR, IT, EN) written into the
template, carried over verbatim from what is stored today so nothing is lost.
Sends keep choosing the member's correspondence language, falling back to
English.

## Technical notes

- Four new React Email templates in `src/lib/email-templates/`:
  `member-welcome`, `member-credential-change`, `member-specialisation`,
  `member-grace-reengagement`. Each reuses the existing shell exported by
  `member-engagement.tsx` (same branding as the grace notices already do) and
  pairs with a `*-copy.ts` translations file following the
  `member-grace-copy.ts` pattern: `(locale, vars) => { subject, body }`.
- Seed each copy file from the current `member_engagement_campaigns.copy`
  values via a one-off read, keeping the `{{placeholder}}` slots as typed
  variables (`first_name`, `credential_from/to`, `specialisation`,
  `grace_end_date`, `events_link`, `leader_link`).
- Register all four in `src/lib/email-templates/registry.ts` with
  `displayName` and `previewData` so they appear in the Cloud preview.
- `src/lib/member-engagement/dispatch.server.ts`: drop `pickCopy` /
  `renderCopyText` on the DB column; resolve the campaign's copy module by key,
  render with `variablesFor(...)` plus the member's `correspondence_locale`, and
  pass the campaign's own template name to `sendMemberEmail`. The TEST-mode gate,
  suppression handling, dedupe, daily cap and `member_email_log` writes are
  untouched. The "No copy authored" skip branch is removed — copy always exists.
- `src/components/manage/MemberEngagementPanel.tsx`: remove the editor, locale
  tabs, placeholder hint and translate action; keep mode, cap, queue, history,
  and add a per-campaign preview link. Remove the now-unused
  `translateEngagementCopy` server fn and the `copy` handling in the campaign
  save fn.
- Database: `member_engagement_campaigns.copy` stops being read or written. No
  migration in this change — the column stays as an archive of the authored text
  until the new templates are confirmed live, then a follow-up drops it.
- Docs: update the member engagement section of `docs/` to state the rule —
  wording lives in the email templates, the dashboard controls sending.

## PR note

**Summary** — Consolidates member email wording into the code template set so
Cloud → Emails shows every message, and reduces the Member engagement screen to
sending controls, queue and history.

**Changes** — Email: four new registered templates with four-language copy
modules seeded from the current database text. Server: dispatcher renders those
templates instead of database copy; translation server fn removed. UI: copy
editor removed from the engagement panel, preview links added.

**Backend / schema changes** — None. `member_engagement_campaigns.copy` becomes
unused; dropping it is a deferred follow-up.

**Testing & verification** — Each template renders in all four languages in the
Cloud preview; a dispatch in TEST mode produces the same subject and body as the
current database copy for a member in each correspondence language; queued and
automatic modes, the daily cap, dedupe and suppression behave as before; history
rows still record status and reason.

**Risks & rollback** — Campaigns are all switched off today, so no live send is
affected. Rollback is reverting the dispatcher and panel; the database copy is
still present.

**Follow-ups / known debt** — Drop the `copy` column once the templates are
confirmed; staff can no longer self-edit campaign wording and must ask for a
change.
