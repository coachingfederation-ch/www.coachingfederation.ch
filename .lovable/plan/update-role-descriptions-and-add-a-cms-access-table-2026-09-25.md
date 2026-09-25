# Update role descriptions and add a CMS access table

The roles section of `docs/auth-and-claim-flow.md` is out of date. It still lists
only `admin`, `editor`, `organizer`, `member` and `user`, and it says projects grant
`editor` automatically, which is no longer true. This change is documentation only.

## What changes in the document

**1. Rewritten "Two kinds of account"**
- Internal staff accounts: registered through the staff invite screen
  (`internal_accounts`), with no member record needed.
- Claimed members: linked through `members.auth_user_id`.
- Rights can only be granted to one of these two kinds of account.

**2. New role table** (replaces the old one)

| Role | Label in the app | Summary |
| --- | --- | --- |
| `admin` | Super Admin | Everything, including Members, Integration and Roles. Can override the no-self-publishing rule. |
| `administrator` | Administrator | Overview, Vocabularies, Coach Finder, Operational Structure, Europe Pulse, Governance, Chat insights, Assistant knowledge, Live chat, guest passes and member engagement |
| `editor` | Editor | Articles, Newsletters, Categories, Editorial signals, Member guides |
| `publisher` | Publisher | Reviews and publishes articles. Cannot publish their own article. |
| `organizer` | Organizer | Events only (their own events, enforced by RLS) |
| `membership` | Membership & Engagement | Guest passes, Member engagement |
| `member` | Member | Member Area and their own directory profile |
| `user` | (dormant) | Nothing grants this role |

Also covers: roles add up rather than replace each other, where each role lands
after sign-in (`landingPath`), and that joining a team no longer grants any access.

**3. New table: "Insights CMS — functional assignment"**

A table with one row per CMS screen and one column per role, marked with a check.
Each row also shows the web address, the navigation guard (`staff-guard.ts`) and
the server-side check (`authz.ts`). It covers Overview, Articles (list, new,
editor), Newsletters, Categories, Editorial signals, Member guides, Events (list,
new, editor, check-in, forms, reporting, CCE), Guest passes, Member engagement,
Vocabularies, Coach Finder, Members, Integration, Operational Structure, Europe
Pulse, Governance, Chat insights, Assistant knowledge, Live chat and Roles.

A short "Article actions" list goes under the table: write, submit for review,
publish/schedule, publish your own article, and the email sent when an article
goes to review.

**4. Small fixes**
- The helper list gains `is_superadmin` / `is_platform_admin`, but only if the
  database confirms they exist.
- The list of `authz.ts` guards is updated.
- Remove the wording that says the Roles screen shows internal accounts read-only.

## Technical notes
- Every table cell comes from the current `staff-guard.ts` route guards, the
  `Shell.tsx` navigation and `authz.ts`, plus the role helpers in the database.
- Known mismatch to write down, not fix: Publishers can open `/articles` and
  `/manage/newsletters`, but those links are missing from their side menu. The
  side menu only shows those links to Editors. This goes in `docs/tech-debt.md`.
- `docs/code-map.md`: link the new table from the `role-model.ts` entry.
- No real member data. No code or schema changes.

## PR note
**Summary.** Brings the role documentation up to date with the Super Admin,
Administrator, Publisher and Membership & Engagement roles, and adds a table
showing which screen each role can use.
**Changes.** Docs: `auth-and-claim-flow.md` (roles section and new table),
`tech-debt.md` (the side-menu mismatch), `code-map.md` (link).
**Backend / schema.** None.
**Testing & verification.** Each cell is checked against the current guards and
navigation code. Markdown is Prettier-formatted.
**Risks & rollback.** Documentation only. To roll back, revert the files.
**Follow-ups.** Decide whether Publishers should see Articles and Newsletters in
their side menu.
