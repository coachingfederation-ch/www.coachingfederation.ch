# Role model rework: Super Admin, Administrator, tightened Editor

## What changes for you

- **Editor** loses Governance and gains Categories.
- **Super Admin** is new: the privileged internal accounts that today sit in the "Internal accounts" list become Super Admins and keep full access to everything, including Roles, Members and Integration.
- **Administrator** becomes an assignable role (granted by a Super Admin only). It gives access to Vocabularies, Coach Finder, Operational Structure, Europe Pulse, Governance, Chat Agent insights, Assistant Knowledge and Live Chat — and nothing else.
- Organizer, Publisher and Member are unchanged.

## Access map after the change

```text
Super Admin    everything (Articles, Events, Members, Integration, Roles, + all Administrator areas)
Administrator  Vocabularies, Coach Finder, Operational Structure, Europe Pulse,
               Governance, Chat Agent, Assistant Knowledge, Live Chat
Editor         Articles, New Article, Categories
Publisher      Articles
Organizer      Events
```

## Database

Verified current state: one account holds `admin`; roughly 33 policies check `has_role(..., 'admin')`, and Governance / Vocabularies / Coach Finder are currently writable via `is_editor`.

Single migration:

1. Add `superadmin` to the `app_role` enum. The existing `admin` grant is migrated to `superadmin`, so today's privileged account keeps full rights; `admin` is then free to mean "Administrator".
2. Add two `private` helper functions:
  - `is_superadmin(uid)` — exactly `superadmin`.
  - `is_platform_admin(uid)` — `admin` or `superadmin`.
3. Repoint policies:
  - Super-Admin-only tables (`user_roles`, `role_grants`, `members`/`member_*`, `integration_config`, `api_rate_limits`, `article_linkedin_posts`, `linkedin_config`): `has_role(uid,'admin')` → `is_superadmin(uid)`.
  - Administrator-scope tables (`cf_*`, `coach_finder_config`, `op_*`, `europe_pulse*`, `governance_documents`, `chat_question_categories`, `chat_interaction_logs`, `assistant_knowledge`, `live_chat_*`): checks become `is_platform_admin(uid)`. Governance, `cf_*` and `coach_finder_config` writes move off `is_editor`, which is what removes Governance from Editors.
  - `categories` keeps `is_editor` (Editors need it) plus platform admins.
4. `private.is_editor` / `is_staff` are updated so `superadmin` still satisfies every existing check that isn't repointed.

## Application code

- `src/lib/role-model.ts`: add `superadmin` to `AppRole`, `STAFF_ROLES`, and `RoleSet` (`isSuperAdmin`, `isPlatformAdmin`); `isAdmin` becomes `admin || superadmin` only where full rights are meant, otherwise call sites move to the explicit flag. `MANAGED_ROLES` gains `admin` (Administrator). Landing path: Administrator lands on `/vocabularies`.
- `src/lib/staff-guard.ts`: replace the blanket `roles.isAdmin` bypass with `isSuperAdmin`, and add an `ADMIN_AREA_ROLES = ["admin"]` list. Apply it to the eight Administrator routes; `articles.categories` moves to `ARTICLE_ROLES`; `manage.governance` moves to the Administrator list; `roles`, `members*`, `integration` become Super-Admin-only.
- `src/lib/authz.ts`: add `assertSuperAdmin`; `assertAdmin` accepts `admin` or `superadmin`. Role-administration functions in `src/lib/roles.functions.ts` switch to `assertSuperAdmin`, and granting `admin` is allowed only there.
- `src/components/cms/Shell.tsx`: per-item `allowedRoles` updated to the access map above; the admin bypass becomes a Super Admin bypass.
- `src/components/cms/RoleTableRow.tsx` / `RoleDetailPanel.tsx` / `src/routes/_staff/roles.tsx`: add an Administrator toggle alongside Editor / Organizer / Publisher, visible to Super Admins; Super Admin itself stays migration-only and read-only.
- i18n: add `roles.superAdmin`, `roles.administrator` and the Administrator toggle labels to `cms.json` in en, de, fr, it.

&nbsp;

# Approval additions

- Update relevant /doc documentation
- Create a new roles specific documentation laying out the access rights per role  


# PR note

**Summary** — Splits the single `admin` role into a migration-only Super Admin and an assignable Administrator with a scoped set of CMS areas, and shifts Governance from Editor to Administrator while giving Editors Categories.

**Changes**

- Backend/schema: new enum value, two `private` role helpers, ~33 policies repointed, existing admin grant migrated to `superadmin`.
- App: role model, staff guards, server-side authz, CMS navigation, Roles screen toggles.
- Config: i18n keys in four locales.

**Backend / schema changes** — one migration as described above. Data change: the single existing `admin` row becomes `superadmin`.

**Testing & verification** — sign in as the Super Admin (all nav present, Roles reachable), grant Administrator to a test account and confirm only the eight areas appear and Members/Integration/Roles redirect, confirm an Editor sees Categories and no longer sees or can write Governance, confirm Organizer and Member areas are untouched.

**Risks & rollback** — blast radius is CMS access control. Enum values cannot be dropped, so rollback means a follow-up migration restoring the old policy bodies and moving `superadmin` back to `admin`. Reverting app code alone would lock the Super Admin out of admin-only screens, so code and migration must be reverted together.

**Follow-ups / known debt** — Super Admin remains provisioned by migration only, by design; a future pass could let one Super Admin promote another with a two-person rule.  
