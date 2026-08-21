# Invite internal (non-member) staff accounts from the Roles screen

Today a privileged account with no imported ICF member record cannot be created from the app at all. The Roles screen shows two populations: claimed members, and accounts that **already** hold a privileged role. A new staff person is in neither list, and the only sign-up path in the app is the member claim flow, which needs an imported member record. So the first account plus the first grant has to be done directly against the database.

There is a second, related limit confirmed in the database: the grant rule currently allows Administrator, Editor, Organizer and Publisher only for accounts that hold the `member` grant. `admin` (Super Admin) is the only role a non-member account can hold. So an internal colleague can today be *nothing but* a Super Admin — the highest privilege — which is the opposite of least privilege.

This plan closes both gaps.

## What changes for you

- **Roles → Internal accounts** gets an **Invite internal account** button. You enter a name, a work email and the starting role, and the person receives a branded invitation email that lets them set a password and sign in.
- The invited person appears in the **Internal accounts** table straight away, marked *Invitation pending* until they accept.
- Internal accounts can now hold the scoped roles too — Administrator, Editor, Organizer, Publisher — not just Super Admin. Their switches work exactly like a member's.
- You can **withdraw** an invitation that has not been accepted, and **remove access** from an internal account as before. The last-Super-Admin and no-self-revoke safeguards are unchanged.
- Every invite, grant and revoke keeps appearing in the role history at the bottom of the page.

## Why an explicit internal list

"Internal account" is inferred today (has a privileged role, has no member row). That inference is exactly what makes a new colleague invisible before their first grant — a chicken-and-egg. Recording internal accounts explicitly makes them listable from the moment they are invited, and gives the database a safe way to tell "chapter staff without an ICF membership" apart from "an account that simply has not claimed its membership yet".

## Technical section

**Database — one migration**

- New table `public.internal_accounts`: `auth_user_id` (PK, references `auth.users`), `display_name`, `email`, `invited_by`, `invited_at`, `accepted_at`, `revoked_at`, timestamps. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role`; no `anon` grant. RLS on, with Super-Admin-only policies via `private.has_role(auth.uid(),'admin')`, plus a read-own policy so an internal account can see its own row. Standard `updated_at` trigger.
- New `private.is_internal_account(uuid)` — security definer, `stable`, `set search_path = public` — true when a live (not revoked) row exists.
- Replace `admins grant managed roles` on `user_roles` so the managed four are allowed when the target holds `member` **or** `private.is_internal_account(user_id)`. `admin` stays allowed as it is today. The revoke policy needs no change.
- Backfill: insert a row for each account currently surfaced as "internal" (privileged role, no `members.auth_user_id`), with `accepted_at = now()`, so the existing list is unchanged after the migration.

**Server**

- `src/lib/internal-accounts.server.ts` — new. Creates the auth user through `supabaseAdmin.auth.admin` (mirroring the pattern already used by QA account provisioning), writes the `internal_accounts` row, and mints the invitation link with `auth.admin.generateLink`. Handles the "email already registered" collision by attaching the existing user id instead of failing, and deletes the freshly created auth user if the follow-up insert fails, so no orphan account is left behind.
- `src/lib/email-templates/internal-invitation.tsx` — new, registered in `registry.ts`, sent through the existing email pipeline in the four chapter languages. Same visual shell as the member claim invitation.
- `src/lib/roles.functions.ts` — new admin-only server functions `inviteInternalAccount`, `resendInternalInvitation`, `withdrawInternalInvitation`, each behind `assertAdmin(context)` and Zod-validated (name, email, role from `GRANTABLE_ROLES`). Role writes keep going through `context.supabase`, so the policies above remain the real boundary and the audit trigger records the acting Super Admin.
- `listInternalStaffAccounts` in `roles-admin.server.ts` becomes a read of `internal_accounts` left-joined with `user_roles`, so accounts with no role yet still appear, and returns an `invitePending` flag.

**UI**

- `src/routes/_staff/roles.tsx` — invite dialog (design-system `Dialog`, `Input`, `Select`, `Button`), a pending badge in the table, and resend/withdraw actions. The internal table's role switches reuse the existing `RoleTableRow`/`SuperAdminSwitch` controls rather than new ones.
- New `roles.*` strings in `src/i18n/locales/{en,de,fr,it}/cms.json`.

**Security notes**

- Only a Super Admin can invite; the role check is server-side, not just a hidden button.
- The invite creates an account with no role until the chosen grant is written, and the grant goes through the same policy every other grant does.
- Invitation links are Supabase-minted and single-use; withdrawing an invitation deletes the auth user when it was created by this flow and never accepted.

## PR note

- **Summary** — Lets a Super Admin invite chapter staff who have no imported ICF member record, and lets those internal accounts hold the scoped roles instead of only Super Admin.
- **Changes** — Backend: `internal_accounts` table, `private.is_internal_account`, relaxed managed-role grant policy, invite/resend/withdraw server functions, new invitation email template. UI: invite dialog, pending state and role switches in the Internal accounts table, strings in four locales.
- **Backend / schema changes** — One migration: new table with grants and RLS, one `private` helper, one replaced policy on `user_roles`, plus a backfill of today's inferred internal accounts.
- **Testing & verification** — Invite a fresh address and accept it end to end; confirm the account lands with exactly the chosen role; confirm an Administrator-only internal account sees only the Administrator areas; confirm invite of an address that already has an account attaches rather than duplicates; withdraw a pending invite and confirm the link stops working; confirm a non-Super-Admin calling the invite function directly is rejected; confirm the last-Super-Admin and self-revoke guards still fire; confirm the existing internal accounts list is identical before and after the migration.
- **Risks & rollback** — Blast radius is access control and account creation. The relaxed grant policy is the sensitive part: it widens managed-role grants to accounts explicitly recorded as internal, and nothing else. Rollback is a migration restoring the previous policy body; the table can be left in place harmlessly if the UI is reverted.
- **Follow-ups / known debt** — No expiry sweep for unaccepted invitations, and no email notification to the invited person when their role later changes.
