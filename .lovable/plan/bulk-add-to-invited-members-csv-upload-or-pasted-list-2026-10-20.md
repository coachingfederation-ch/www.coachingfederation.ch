# Bulk add to "Invited members": CSV upload or pasted list

## What you get
Under the member search in the "Invited members" section, a new **Add several at once** area:
- A text box where you paste email addresses separated by commas, semicolons, spaces, or new lines (e.g. the list from Outlook).
- An **Upload CSV** button as an alternative. Any column holding email addresses is picked up; other columns (names, etc.) are ignored.
- A **Check list** step first shows a preview before anything is sent:
  - Will be invited (matched to an active member, name shown)
  - Already on the list (skipped)
  - Not found as an active member (skipped, shown so you can follow up)
  - Invalid entries (not an email)
- **Send invitations** then invites all matched members in one go; each gets the usual personal email in their own language. A summary appears afterwards and the list below refreshes.

The guest list stays limited to active members, as today, so unknown addresses are reported, never invited.

## Technical details
- `src/lib/event-invitations.functions.ts`: two new staff server fns behind `requireSupabaseAuth` + `assertManagesEvent`:
  - `previewBulkInvitations({ eventId, emails[] })` (max 500, lowercased, deduped) returns matched / alreadyInvited / notFound.
  - `addBulkInvitations({ eventId, memberIds[] })` loops the existing `addInvitation` sequentially and returns per-row outcomes.
- `src/lib/event-invitations.server.ts`: helper to match emails against active members (same eligibility as `listInvitableMembers`). Matching is only for picking invitees, not for account binding.
- Parsing (split on `,;\s`, strip `<>` and quotes, validate email) in a small pure helper `src/lib/invite-list-parse.ts` with a vitest test.
- `EventInvitationsSection.tsx`: new block using design-system `Textarea`, `Button`, file input; CSV read client-side via `FileReader`.
- New strings in `src/i18n/locales/{en,de,fr,it}/cms.json`; update `docs/events-team-communities.md`.

## PR note
- **Summary**: Staff can add many invitees at once by pasting emails or uploading a CSV, with a preview before sending.
- **Changes**: UI bulk area in the invitations section; two server fns; parser helper + test; i18n; docs.
- **Backend / Schema**: None.
- **Testing**: Paste mixed list (valid, duplicate, non-member, garbage); upload CSV with header row; confirm emails sent and statuses appear; non-manager cannot call fns.
- **Risks & rollback**: Scoped to this section; revert code only. Large lists send many emails; capped at 500 per run.
- **Follow-ups**: Inviting non-members (external guests) remains out of scope.
