# Manage roles for internal accounts

The "Internal accounts" table on /roles currently only offers a Super Admin switch, resend/withdraw, remove-access and revoke. There is no way to add or change the individual rights (Administrator, Editor, Event organizer, Publisher, Membership & Engagement) the way the member table allows through its detail panel.

## What changes

- Each internal-account row gets a **Manage** button, matching the member table's row action.
- Clicking it opens the same side panel used for members, showing:
  - name, email, account id, invitation status
  - the rights checklist: Administrator, Editor, Event organizer, Publisher, Membership & Engagement
  - **Super Admin** as the separate, distinctly styled switch (same self / last-Super-Admin guards as today)
  - the per-account grant history
- Toggling a right grants or revokes it immediately, then the tables reload.
- The Super Admin switch currently rendered inline in the row moves into the panel, so the row keeps only invitation and account actions (Resend, Withdraw, Remove access, Revoke account). Keeps the row readable and puts all role editing in one place.

No backend or database change is needed: the existing `grantAccountRole` / `revokeAccountRole` functions already accept every grantable role including `admin`, and they already verify the account has a live internal-account marker before granting a scoped right.

## Technical notes

- `src/components/cms/RoleDetailPanel.tsx`: generalise the panel so it accepts a plain shape (name, email, authUserId, held roles, optional member metadata) instead of only a `MemberRow`. The member call site passes a mapped object; the internal call site passes the internal row. `SuperAdminSwitch` is already exported and gets rendered inside the panel for both cases.
- `src/routes/_staff/roles.tsx`: add `selectedAccountId` state, a Manage button per internal row, and a toggle handler keyed by `authUserId` that calls `grantAccountRole` / `revokeAccountRole`.
- New CMS i18n key for the Manage label if none exists (reuse the member table's key when it does), added in all four locales.

## PR note

**Summary** — Adds per-right role management for internal (non-member) staff accounts on /roles, including Super Admin, via the existing member detail panel.

**Changes**
- UI: Manage action on internal-account rows; detail panel generalised to accept member or internal accounts; Super Admin switch moved from the row into the panel.
- i18n: Manage label in de/fr/it/en CMS strings if a new key is needed.

**Backend / Schema Changes** — None. Existing `grantAccountRole` / `revokeAccountRole` server functions and RLS policies are unchanged.

**Testing & Verification** — As a Super Admin: open the panel for a pending invite and for an accepted internal account; grant and revoke each scoped right; confirm the grant history updates; confirm Super Admin cannot be toggled off for your own account or the last remaining Super Admin; confirm a scoped grant on an account without a live internal marker still fails with the readable error.

**Risks & Rollback** — Frontend-only; revert the two files to roll back. No migration.

**Follow-ups** — None planned.
