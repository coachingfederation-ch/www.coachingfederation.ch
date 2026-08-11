# Publisher as a real role + role detail view

## What changes

Today "who may publish an article" is derived from the operational structure: an account must
hold the *Publisher* role inside the *Communication & Marketing* project. That couples editorial
permissions to an org chart. This replaces it with a first-class `publisher` role sitting next to
`editor` and `organizer`, granted on the Roles screen like any other access right.

The Roles screen also gets reworked: the table becomes a compact overview (name, email, link,
access badges) and every row opens a detail view where access rights are actually assigned.

## Behaviour after the change

- Access rights are `editor`, `organizer`, `publisher` (plus `admin`, still migration-only).
- Only accounts holding `publisher` (or `admin`) can move an article to published/scheduled, and
  never their own article — the four-eye rule itself is unchanged.
- `publisher` counts as staff, so a publisher-only account can reach the Insights CMS to review
  and publish, but cannot create/edit unless they also hold `editor`.
- The existing Communication & Marketing publisher assignment is migrated to the
  new role, so no one loses publishing ability.
- The op-structure "Publisher" role stays as an organisational label but no longer grants anything.

## Roles screen

Table columns: Name · Email · Link · Access (badges only) · Manage.
"Manage" opens a slide-over detail panel for that account showing:

```text
Anna Muster
anna.muster@example.com · ICF 000000 · claimed 0000000…
Member · active

Access rights
[x] Editor      Create and edit articles
[ ] Organizer   Create and manage events
[x] Publisher   Review and publish articles

[ Remove all access ]

Recent changes for this account
editor granted by … · 5 Aug 2026
```

Each right toggles independently and saves immediately; the table refreshes behind the panel.
Admin accounts stay read-only ("provisioned separately"). The internal-accounts table and the
QA panel keep their current behaviour, with publisher badges added.

## Technical notes

Backend
- Migration: add `publisher` to the `app_role` enum; update `private.is_article_publisher` to
  `private.has_role(_user_id, 'publisher')`; add `publisher` to `private.is_staff`; backfill a
  `publisher` grant for every current Communication & Marketing publisher; extend the
  `user_roles` grant/revoke RLS policies so admins can manage `publisher`.
- `src/lib/role-model.ts`: `AppRole` + `MANAGED_ROLES` + `STAFF_ROLES` gain `publisher`;
  `RoleSet.isPublisher`; landing path unchanged for members, publisher-only lands on `/articles`.
- `src/lib/articles.server.ts`: `isArticlePublisher` reads `user_roles` instead of walking
  op_projects/op_assignments; `PUBLISHER_PROJECT_SLUG`/`PUBLISHER_ROLE_SLUG` removed.
- `src/lib/roles-admin.server.ts`: `ClaimedMemberRole` gains `isPublisher`; new
  `listRoleGrantAuditForUser(authUserId)` for the panel.
- `src/lib/roles.functions.ts`: grant/revoke already take a `ManagedRole`, so they accept
  `publisher` once the enum widens; add the per-account audit read.
- `src/lib/staff-guard.ts` / article route guards: allow publisher into `/articles`, keep
  create/edit gated on editor.

Frontend
- `src/components/cms/RoleTableRow.tsx` reduced to badges + a Manage button.
- New `src/components/cms/RoleDetailPanel.tsx` with the toggles, remove-all and per-account audit.
- `src/routes/_staff/roles.tsx` holds the selected row and passes the mutation handlers.
- CMS i18n (en/de/fr/it): publisher badge/toggle labels, panel headings, and reworded
  `reviewNeedsPublisher` / refusal messages (no longer mention Communication & Marketing).

Docs
- `docs/article-publishing.md`: replace the op-structure section with the role-based rule.

## PR note

**Summary** — Turns article publishing rights into a real `publisher` role instead of an
operational-structure assignment, and reworks the Roles admin into overview table + per-row
detail panel.

**Changes** — DB enum/function/policy updates; role model, article permission check, roles admin
read model; roles UI split into table + detail panel; i18n and docs.

**Backend / schema** — `app_role` enum value added (irreversible), `private.is_article_publisher`
and `private.is_staff` rewritten, `user_roles` policies widened, publisher grants backfilled.

**Testing** — verify: publisher-only account can publish but not self-publish; editor without
publisher sees Submit for review only; admin unchanged; Susan Mackay retains publishing; grant
and revoke of each right from the detail panel appears in the audit log.

**Risks & rollback** — Blast radius is publishing and the roles screen. Reverting code while the
migration stays applied is safe (extra enum value + role rows are inert). The op-structure
Publisher role is left in place, so the old check could be restored.

**Follow-ups** — Publisher-only accounts get a read-oriented CMS; a dedicated review queue is not
part of this change.
