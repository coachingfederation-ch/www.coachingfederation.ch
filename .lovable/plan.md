# Secured read-only export of the Operational Structure

A second internal app needs to mirror the chapter's operational structure. This adds one
new endpoint that returns the list of active structural units — names only, no people.

## What gets added

A single new file, `src/routes/api/public/op-structure.ts`, exposing `GET /api/public/op-structure`.

Nothing else changes: no UI, no database change, no edit to the existing role-directory route.

## Security

Same shared-secret pattern as the existing role directory export:

- The caller must send header `x-role-directory-secret` matching `ROLE_DIRECTORY_SECRET`.
- The secret is read inside the handler (`process.env["ROLE_DIRECTORY_SECRET"]`), never at module scope.
- Length check first, then exact compare — mirroring the existing `authorised()` helper.
- Any mismatch or missing secret returns `401 Unauthorized` with no detail.
- No member, assignment, contact email or personal data is ever included.

## Data returned

Read from `op_projects` with the service-role client, loaded inside the handler
(`await import("@/integrations/supabase/client.server")`), filtered to `is_active = true`
and ordered by `sort_order`. Communities are included and flagged, not filtered out.

```json
[
  {
    "slug": "events-programmes",
    "name": "Events & Programmes",
    "name_de": "",
    "name_fr": "",
    "name_it": "",
    "sort_order": 3,
    "is_community": false
  }
]
```

Normalisation before returning: missing translations become `""`, `sort_order` is coerced
to a number, `is_community` to a boolean. Response carries `cache-control: no-store`.

## Technical notes

- `createFileRoute("/api/public/op-structure")` with a `server.handlers.GET` handler,
  matching the shape of `src/routes/api/public/role-directory.ts`.
- Selected columns: `slug, name, name_de, name_fr, name_it, sort_order, is_community`.
  The staff-only `is_project_team` flag is intentionally left out of the payload.
- Database errors return `500` with the error message, as the existing export does.

## PR note

**Summary** — Adds a secret-guarded, read-only JSON export of the active operational
structure so another internal app can mirror unit names and ordering.

**Changes** — One new file: `src/routes/api/public/op-structure.ts`. No UI, schema, or
existing-route changes.

**Backend / schema changes** — None. Reuses the existing `ROLE_DIRECTORY_SECRET`.

**Testing & verification** — Call the endpoint without the header (expect 401), with a
wrong secret (expect 401), and with the correct secret (expect the ordered array,
communities flagged, no personal fields). Typecheck and build.

**Risks & rollback** — Low. Additive route; delete the file to revert. Endpoint sits under
`/api/public/*`, which bypasses site auth, so the shared secret is the only gate — hence
the deliberate exclusion of any personal data.

**Follow-ups** — If the consuming app later needs the project-team distinction or
assignments, that is a separate change with its own review of what may leave the system.
