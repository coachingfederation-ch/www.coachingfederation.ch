# Role history: last 10 with filters, plus an archive retention job

Today the Roles screen loads the 50 most recent role changes and prints them all as one long list. This plan trims that to the last 10, adds filtering and "show more", and moves entries older than 24 months into an archive table on a schedule.

## What changes for you

- The **Role change history** block shows the **10 most recent** changes.
- Above it: a small filter row — search by person, role (Super Admin / Administrator / Editor / Organizer / Publisher / Member), and action (granted / revoked).
- Below it: **Show more** loads the next 10, repeatedly, until there is nothing left. A counter shows "10 of N".
- Filters are applied in the database, so a filtered search reaches the whole history, not just the loaded page.
- Entries older than **24 months** are moved nightly into an archive table. They disappear from this screen but are never lost; they remain queryable for governance/audit requests.
- The per-account history in the detail panel is unchanged (it already shows a short list).

## Technical section

**Database (one migration)**
- `public.role_grants_archive` — same columns as `role_grants` plus `archived_at`. No `anon`/`authenticated` grants; `service_role` only, RLS enabled with no permissive policy (reachable only through the service-role path).
- `private.archive_old_role_grants(_older_than interval default '24 months')` — security definer: `INSERT INTO role_grants_archive SELECT ... FROM role_grants WHERE created_at < now() - interval`, then delete the same rows in one statement (`WITH moved AS (DELETE ... RETURNING *) INSERT ...`), returning the count.
- Fix an existing over-grant spotted in the baseline: `role_grants` currently has `DELETE, INSERT, SELECT, UPDATE` for `anon`. Revoke all `anon` privileges on that table — the only read policy is admin-scoped, so the grant is dead weight and a needless exposure.

**Retention endpoint**
- `src/routes/api/public/role-grants-archive.ts` — POST, guarded by `isAuthorisedCronRequest` exactly like `live-chat-purge`, calls a new `archiveOldRoleGrants()` in `src/lib/roles-admin.server.ts` and logs `archived=N`. Scheduled nightly by pg_cron/pg_net in the same migration, following the existing cron entries.

**Read model (`src/lib/roles-admin.server.ts`)**
- `listRoleGrantAudit(limit, offset, filters)` — accepts `{ search?, role?, action? }`, uses `.range()` and `{ count: "exact" }` so the UI can show totals and know when to hide "Show more".
- Name search resolves ids first (members, then profiles, then auth email) and filters `user_id IN (...)`, matching how names are already resolved for display.

**Server function (`src/lib/roles.functions.ts`)**
- `listRoleAdminData` returns only the first page (limit 10) plus `auditTotal`.
- New `listRoleGrantHistory` server fn (admin-only, `assertAdmin`) for paging and filtering, so the heavy member/internal-account read is not repeated on every "Show more".

**UI (`src/routes/_staff/roles.tsx`)**
- Extract the history block into `src/components/cms/RoleAuditList.tsx` (the roles route is already large): filter row, list, "Show more", counter, empty state.
- New `cms.json` keys under `roles.*` in en/de/fr/it: filter labels, role/action option labels, show-more, counter, "no matching changes", archive note.

## PR note

- **Summary** — Limits the role change history to 10 entries with server-side filtering and incremental paging, and adds a nightly job that archives entries older than 24 months into a service-role-only table.
- **Changes** — UI: new `RoleAuditList` component with filters/paging, four-language strings. Backend: paginated + filtered audit reader, new admin server fn, cron-authed archive endpoint.
- **Backend / Schema changes** — One migration: `role_grants_archive` table (RLS on, service_role only), `private.archive_old_role_grants()`, nightly pg_cron schedule, and revocation of the stray `anon` grants on `role_grants`.
- **Testing & verification** — Confirm the list shows 10 and "Show more" pages through to the total; confirm each filter returns rows outside the first page; confirm a non-Super-Admin cannot call the new server fn; run the archive endpoint without the cron token (401) and with it (rows move, count matches, screen no longer lists them); confirm archived rows are unreadable from the browser client.
- **Risks & rollback** — Low blast radius: read-side paging plus an additive table. The archive job deletes from `role_grants` after a successful insert in one statement, so a failure leaves the source rows intact. Rollback = revert the UI and drop the schedule; the archive table is safe to leave.
- **Follow-ups / known debt** — No CSV export of history and no UI for browsing the archive; date-range filtering deferred.
