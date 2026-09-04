# Team assignment no longer grants access

## What happens today

Assigning a member to a project in the operational structure screen silently gives them the editor role, and removing their last assignment asks whether to take it away again. That mixes two different things: who volunteers in which team, and who may work in the staff area.

## What changes

- Assigning someone to a team only records the assignment. No role is granted.
- Unassigning someone no longer asks about revoking anything.
- After a successful assignment, a short hint appears: this person now appears on the team page; if they also need access to the staff area, grant it in the Roles screen.
- The note under the assignment list is rewritten to say that roles are managed in the Roles screen, replacing "Assigning a member also grants them the editor role."
- The "member has not claimed their account yet" warning stays, since it still matters for the team page and the Member Area.

Existing editor roles are untouched — nobody loses access.

## Technical notes

- `src/routes/_staff/operational-structure.tsx`: drop the `grantMemberRole` call in `assign()` and the `countOpsAssignments` + `window.confirm` + `revokeMemberRole` block in `unassign()`; remove the now-unused imports and update the file header comment. Replace the error-channel misuse (`setError(t("ops.grantFailed"))`) with a new non-error `notice` state rendered under the assignment controls.
- `src/components/cms/ops/RoleAssignmentEditor.tsx`: accept an optional `notice` prop and render it below the assign controls in muted text; keep everything else unchanged.
- i18n (`cms.json` in en/de/fr/it): rewrite `ops.assignmentsNote`, add `ops.assignHint`, remove the now-unused `ops.grantFailed`, `ops.revokeFailed`, `ops.confirmRevoke` keys.
- No migration, no RLS or grant change. `grantMemberRole` / `revokeMemberRole` remain in use by the Roles screen.

## PR note

**Summary** — Removes the implicit editor-role grant/revoke tied to operational-structure assignments, so role management lives only in the Roles screen; replaces it with an informational hint.

**Changes** — CMS: assignment handlers lose their role side effects; new hint line under the assignment controls; reworded note. i18n: one reworded key, one new key, three removed keys in four locales.

**Backend / schema changes** — None.

**Testing & verification** — Assign and unassign a member with and without a claimed account; confirm no role change occurs, the hint shows, no confirm dialog appears, and the team page still lists the person; check the Roles screen still grants and revokes; typecheck and build.

**Risks & rollback** — Low. Behavioural only; no data written differently. Rollback is reverting the code. Note that after this change new team members do not automatically get staff access, which is the intent.

**Follow-ups** — Optionally link the hint directly to the Roles screen filtered to that member.
