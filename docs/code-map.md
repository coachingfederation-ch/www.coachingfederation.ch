# Code map

A directory of where behaviour lives. Use this to find the owner of a feature
before adding a new file.

## Domain layer (`src/lib`)

### Coach directory

| Module                     | Responsibility                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `directory.functions.ts`   | Public search RPC: filtering, faceting, pagination against `coach_directory_public`, plus signed image URLs.                                                       |
| `directory-eligibility.ts` | The single definition of who may appear publicly. `publishBlockReason` is the shared predicate used by the member editor, staff tooling and the server write path. |
| `coaches.ts`               | Client-safe directory types and display helpers.                                                                                                                   |
| `coach-finder-config.*`    | The coaching/mentoring/supervision mode configuration that drives the public mode tabs.                                                                            |

### Member data and the ICF pipeline

| Module                                       | Responsibility                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `member-sync.server.ts`                      | The import engine: pull the ICF feed, normalise, diff, create/update/deactivate, demote profiles that lost eligibility. The most operationally sensitive module in the project. See `docs/member-sync.md`. |
| `icf-soap.server.ts`                         | SOAP/xWeb client for netFORUM. Credentials read inside handlers.                                                                                                                |
| `integration-config.server.ts`               | Loads the single `integration_config` row (TEST vs LIVE, email suppression, claim gate).                                                                                        |
| `member-profile.server.ts` / `.functions.ts` | Member self-service profile: validation, cleaning, the guarded publish path.                                                                                                    |
| `member-claim.server.ts`                     | Account claim token state machine — hashing, expiry, attempt limiting, single use.                                                                                              |
| `member-email.server.ts`                     | Email dispatch. Currently logs every intended send and delivers nothing; see operations doc.                                                                                    |
| `member-translations.*`                      | Per-locale coach profile content: translatable field list, derived states, AI translation and the member RPC surface. See `docs/member-translations.md`.                        |

### Insights CMS

| Module                      | Responsibility                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `articles.ts`               | Shared types (`ArticleRow`, `CategoryRow`, `ProfileRow`) and display helpers used by both the CMS and the public blog. |
| `articles.server.ts`        | Article reads, writes, status transitions and deletion.                                                                |
| `articles.functions.ts`     | The CMS RPC surface, with `assertStaff` guards.                                                                        |
| `insights.functions.ts`     | Public reads for the published blog.                                                                                   |
| `translations.functions.ts` | Per-locale translation rows and AI-assisted translation.                                                               |

### Events

| Module                            | Responsibility                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `events.ts`                       | Shared event types, status/registration helpers and date formatting.                 |
| `events.functions.ts`             | Public reads (`events_public`) and free RSVP registration.                           |
| `events-admin.functions.ts`       | Staff event CRUD, publishing and registration lists. Gated on `organizer`/`editor`.  |
| `event-translations.functions.ts` | Per-locale event content and AI translation, mirroring the article translation flow. |

### Team, operational structure and communities

| Module                                             | Responsibility                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ops-admin.server.ts` / `.functions.ts`            | Admin CRUD for projects, project roles and member assignments, plus the automatic `editor` grant. |
| `team.ts` / `team.server.ts` / `team.functions.ts` | Public team page data: localized names, roles and project filters.                                |
| `communities.*`                                    | Local communities: overview, detail, language labels and the featured community teaser.           |
| `community-translations.functions.ts`              | AI translation of community description and cadence copy.                                         |

### Europe Pulse

| Module                      | Responsibility                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `europe-pulse.ts`           | Client-safe types, locale resolution for curated items, flag emoji and week-start helpers.                                      |
| `europe-pulse.server.ts`    | The weekly scan engine: Firecrawl pacing and retries, AI extraction, curation and multilingual writing, failure classification. |
| `europe-pulse.functions.ts` | Public feed read, the admin "scan now" trigger and the failed-chapter retry. See `docs/europe-pulse.md`.                        |

### Shared infrastructure

| Module                        | Responsibility                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `storage.ts`                  | Bucket names and signed-URL lifetimes. Client-safe constants; the one place these strings are written. |
| `storage.server.ts`           | `signStoragePaths` / `signProfileImages` — batch signing via the admin client.                         |
| `supabase-public.server.ts`   | Anonymous client factory, including the `sb_`-key `apikey` header workaround.                          |
| `roles.ts` / `role-model.ts`  | Role constants, `STAFF_ROLES`, `landingPath` and the `useMyRoles` hook that drives UI gating.          |
| `authz.ts` / `staff-guard.ts` | `assertStaff` / `assertAdmin` / `assertEditor` and the route-level staff gate.                         |
| `mcp/`                        | The MCP server tools exposed at `/mcp` (see `docs/architecture.md`).                                   |

## Routes (`src/routes`)

| Path                                                                                                            | Notes                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`, `about`, `events`, `for-coaches`, `for-organisations`, `find-a-coach`, `insights*`, `coach.$profileId` | Public. Each has a `$locale/` mirror rendering the same `src/pages` component.                                                                          |
| `_staff/route.tsx`                                                                                              | Staff gate. Children: `articles*` (CMS), `manage.events*`, `members*`, `operational-structure`, `roles`, `vocabularies`, `coach-finder`, `integration`. |
| `_member/route.tsx`                                                                                             | Member gate. Child: `my-profile`.                                                                                                                       |
| `auth`, `auth.callback`, `staff-sign-in`                                                                        | Member sign-in, the role-based post-login redirect, and the separate internal/staff entry point.                                                        |
| `events.index`, `events.$slug`, `team`, `communities.index`, `communities.$slug`                                | Public events, team honeycomb and local communities, each with a `$locale/` mirror.                                                                     |
| `mcp.ts`, `[.mcp]/…`, `[.well-known]/…`                                                                         | Generated by `mcpPlugin()`. Never edit by hand.                                                                                                         |
| `claim.index`, `claim.$token`                                                                                   | Account claiming (gated off until cutover).                                                                                                             |
| `api/public/member-sync.ts`                                                                                     | Cron trigger for the nightly ICF sync.                                                                                                                  |
| `api/public/europe-pulse-scan.ts`                                                                               | Cron trigger for the weekly Europe Pulse scan. Same `x-cron-token` pattern.                                                                             |
| `europe-pulse`, `_staff/manage.europe-pulse`                                                                    | Public weekly European chapter feed (with `$locale/` mirror) and the admin control room.                                                                |
| `sitemap[.]xml.ts`                                                                                              | Generated sitemap across all four locales.                                                                                                              |

## Components (`src/components`)

| Group                         | Contents                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `site-chrome.tsx`             | Public header, footer, responsive nav, language switcher.                                     |
| `coaches/`                    | Directory list, filter panel, mode tabs, coach cards.                                         |
| `cms/`                        | Staff shell, Markdown editor, translations panel, Unsplash picker, and `MemberProfileEditor`. |
| `member/`                     | Member Area presentational pieces.                                                            |
| `team/`                       | `TeamGrid` (hexagon honeycomb), `TeamPreview` and the shared `MemberModal`.                   |
| `communities/`                | `CommunityRing` (member ring layout) and the About-page `CommunitiesPreview`.                 |
| `organisations/`              | The "For organisations" sections, survey and gated deck download.                             |
| `markdown.tsx`, `callout.tsx` | Article rendering, including the three-shade callout system built on a remark AST plugin.     |
| `marks.tsx`                   | Hand-drawn decorative SVG marks.                                                              |
| `ui/`                         | shadcn/ui primitives. Prefer these over new bespoke controls.                                 |

## Database objects worth knowing

- **`coach_directory_public`** — the view every public directory read goes
  through. Change the projection here, not in application code. It is
  `security_invoker = on`, so the caller's own RLS still applies underneath.
- **`events_public`, `team_projects_public`** — the same view-first pattern for
  published events and active operational projects. Both `security_invoker = on`.
- **`team_directory_public`** — an invoker view over the security-definer
  function `private.team_directory_rows()`. The function is the projection
  boundary: the team page needs rows for members whose directory profile is not
  published, so the data is assembled once, in one place, instead of widening
  the RLS policies on `members` and `member_directory_profiles`.
- **`public.members` column grants** — `anon` and `authenticated` have **no**
  table-level SELECT. Only non-sensitive columns are granted (names, city,
  country, organisation, credential data, `activity_state`). Email and phone
  reach the public only through `private.directory_contact_email`, which
  respects the coach's `contact_email_public` opt-in. Staff reads go through the
  service role in `*.server.ts`, so they are unaffected — but a new public query
  that selects `email` will fail with a permission error, by design.
- **`user_roles`** + `private.has_role` / `private.is_editor` /
  `private.is_staff` — the whole authorization model. The helpers sit in the
  non-exposed `private` schema; application code uses `src/lib/authz.ts`
  instead of calling them over RPC.
- **`coach_finder_config`** — one row. Display columns are readable by
  visitors; the internal tuning columns are restricted by **column-level**
  grants and read through `coach-finder-config.functions.ts` by staff.
- **`integration_config`** — one row, guarded by a trigger, controlling the
  TEST/LIVE posture.
- **`member_sync_runs`, `member_sync_events`, `member_import_snapshots`** — the
  audit trail for every sync. First place to look when member data looks wrong;
  reading them is explained in `docs/member-sync.md`.

- **Buckets** `member-profile-images` and `article-images` — both private;
  access is always via signed URLs.
