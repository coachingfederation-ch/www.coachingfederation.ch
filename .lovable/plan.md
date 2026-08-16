# Make Super Admin assignable in the Roles screen

Today Super Admin (`admin`) can only be created by a database migration: the Roles screen grants Administrator, Editor, Organizer and Publisher only, and the database policies explicitly refuse any other grant. This plan makes Super Admin grantable and revocable by an existing Super Admin, with safeguards so the chapter can never lock itself out.

## What changes for you

- In the per-account detail panel on **Roles**, a Super Admin sees a new **Super Admin** switch alongside Administrator/Editor/Organizer/Publisher.
- The **Internal accounts** table gets the same switch, so privileged non-member accounts can also be promoted or demoted.
- A small **Add Super Admin by email** field lets you promote an account that is neither a claimed member nor already privileged (it must have signed in at least once, so the account exists).
- Guardrails:
  - You cannot remove your own Super Admin grant (avoids accidental self-lockout).
  - The last remaining Super Admin cannot be removed.
  - Granting or revoking Super Admin requires a typed confirmation ("Grant full access to <name>?"), and every change is written to the existing role audit trail shown at the bottom of the page.
- Nothing about membership, directory profiles or Member Area access changes.

## Technical section

**Database (one migration)**
- Replace `admins grant managed roles` / `admins revoke managed roles` on `public.user_roles` so `admin` is allowed in addition to the four managed roles, keeping `private.has_role(auth.uid(),'admin')` as the actor test. The existing `AND private.has_role(user_id,'member')` requirement stays for the four managed roles but is not applied to `admin`, since internal staff accounts have no member record.
- Add a `BEFORE DELETE` trigger on `user_roles` that raises when the deleted row is the last `admin` row, and when `OLD.user_id = auth.uid()` for role `admin`. This makes the safeguard a database invariant, not just a UI rule.
- The existing `user_roles_audit` trigger already records grants/revokes; no change needed.

**Server (`src/lib/roles.functions.ts`, `src/lib/roles-admin.server.ts`)**
- Widen the grant/revoke input schema from `MANAGED_ROLES` to `MANAGED_ROLES + "admin"`, keeping `assertAdmin(context)` and writing through `context.supabase` so RLS remains the boundary.
- Add `findAccountByEmail` (admin client, exact lower-cased match) used by a new `grantSuperAdminByEmail` server function; it returns a neutral "no account found" message and never reveals other account details.
- `revokeAccountStaffRoles` keeps operating on `MANAGED_ROLES` only — the bulk "Remove access" button must not silently strip Super Admin.

**Role model (`src/lib/role-model.ts`)**
- Introduce `GRANTABLE_ROLES = ["admin", ...MANAGED_ROLES]` for the UI and validators. `MANAGED_ROLES`, `STAFF_ROLES`, `toRoleSet` and every `isAdmin` check stay exactly as they are, so no existing gate changes meaning.

**UI (`src/routes/_staff/roles.tsx`, `RoleDetailPanel.tsx`, `RoleTableRow.tsx`)**
- Extend the explicit per-role `held` mapping in `toggle` with the `admin` case (same pattern as the recent Administrator fix — no fall-through default).
- Render the Super Admin switch visually distinct (destructive-toned) with the confirmation dialog, and disable it for your own row and when only one Super Admin exists.
- Add the email promotion field above the Internal accounts table.
- New CMS strings in `src/i18n/locales/{en,de,fr,it}/cms.json` under `roles.*`: switch label, description, confirm text, self/last-admin disabled hints, email-promote label, and the not-found and success messages.

## PR note

- **Summary** — Makes the Super Admin grant assignable and revocable from the Roles screen by existing Super Admins, replacing the migration-only provisioning step, with lockout protection enforced in the database.
- **Changes** — UI: Super Admin switch in the role detail panel and internal accounts table, promote-by-email field, confirmation dialog, four-language strings. Backend: widened grant/revoke validators, new `grantSuperAdminByEmail`, account lookup helper.
- **Backend / Schema changes** — One migration: re-created grant/revoke policies on `user_roles` to allow `admin`; new `BEFORE DELETE` trigger preventing self-revoke and last-Super-Admin removal. No new tables or columns.
- **Testing & verification** — Grant and revoke Super Admin for a claimed member and for an internal account; confirm the audit list records both; confirm self-revoke and last-admin revoke are refused by the database (not just the UI); confirm an Administrator (non-Super) sees no Super Admin switch and a direct server call from them is rejected; confirm bulk "Remove access" leaves Super Admin intact.
- **Risks & rollback** — Highest-privilege surface, so the blast radius is access control. Rollback is a migration restoring the previous policy pair; the trigger is safe to leave in place if the UI is reverted.
- **Follow-ups / known debt** — No email notification on privilege change; no time-boxed or break-glass Super Admin grants.
