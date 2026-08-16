# The Switzerland Chapter of ICF website

The public website and member platform of the Swiss Charter Chapter of the
International Coaching Federation. It serves three audiences from one codebase:
people looking for a credentialed coach, organisations exploring coaching
programmes, and The Switzerland Chapter of ICF's own members and staff.

## What's in here

Five functional areas, each with its own access boundary:

| Area                                                                                                | Who                         | Where                                                               |
| --------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| **Public site** — home, for coaches, for organisations, events, about, Insights blog                | Everyone                    | `src/routes/*.tsx`, `src/routes/$locale/*`                          |
| **Coach directory** — "Find a coach", filters, public coach profiles                                | Everyone                    | `src/components/coaches/`, `src/lib/directory.functions.ts`         |
| **Team & communities** — operational structure, the honeycomb team grid, local communities          | Everyone                    | `src/components/team/`, `src/components/communities/`               |
| **Member Area** — a member editing their own directory profile                                      | Signed-in members           | `src/routes/_member/`, `src/components/cms/MemberProfileEditor.tsx` |
| **Staff tooling** — Insights CMS, events, member admin, operational structure, integration controls | Admins, editors, organizers | `src/routes/_staff/`                                                |

Everything is available in four languages (DE, FR, IT, EN) via path prefixes:
`/find-a-coach` is English, `/de/find-a-coach` is German.

## Stack

- **TanStack Start v1** (React 19, TanStack Router, file-based routes), built
  with Vite and deployed to a Cloudflare Workers-style edge runtime.
- **Supabase** for Postgres, auth, storage and row-level security. Referred to
  in the product as "the backend".
- **Tailwind CSS v4**, configured through `src/styles.css` (no
  `tailwind.config.js`), with shadcn/ui primitives in `src/components/ui`.
- **TanStack Query** for client-side data fetching.

There is no separate API server. Server-side work runs either as a typed
server function (`createServerFn`) or, for external callers, as a file route
under `src/routes/api/public/`.

## How the code is organised

```
src/
  routes/           file-based routes (see src/routes/README.md for naming)
    $locale/          localized mirrors of the public routes
    _member/          member-only shell
    _staff/           staff-only shell (CMS + member admin)
    api/public/       external HTTP endpoints (the sync cron trigger)
  pages/            page bodies rendered by the public routes
  components/       UI, grouped by area (coaches/, cms/, member/, organisations/, ui/)
  lib/              the domain layer — see below
  i18n/             locale config, dictionaries, <LocaleLink>
  integrations/supabase/   generated clients and auth middleware (do not edit)
```

`src/lib` is where the actual behaviour lives, and the filename suffix tells
you the trust boundary:

- `*.functions.ts` — `createServerFn` RPC entry points. Safe to import from
  components; the build replaces the body with a stub in the browser bundle.
- `*.server.ts` — server-only logic. Never imported from a route or component.
- everything else — shared, client-safe helpers and types.

## Where to start reading

1. `docs/architecture.md` — the layers and where each boundary is enforced.
2. `docs/code-map.md` — a module-by-module table; the fastest way to find the
   owner of a behaviour.
3. `src/lib/directory.functions.ts` — the clearest example of the public read
   path, view-first and admin-last.
4. `src/lib/member-sync.server.ts` — the ICF import pipeline, the most
   operationally significant code in the project.

Most modules under `src/lib` open with a doc comment explaining the rule they
encode and, where it matters, why the obvious alternative was rejected. Read
those before changing behaviour.

## Configuration

Supabase URL and publishable key are injected as `VITE_SUPABASE_*` (browser)
and `SUPABASE_*` (server). Server secrets — the ICF SOAP credentials, the
service role key — are only ever read inside server function handlers via
`process.env`, never at module scope.

The single most important runtime switch is not an env var: it is the one row
in the `integration_config` table, which decides whether the member pipeline
talks to the ICF **TEST** or **LIVE** feed, whether member-facing email is
suppressed, and whether account claiming is open. See
`docs/operations-and-go-live.md`.

## Current status

**Working today**

- Public site and Insights blog in four languages, with a full CMS
  (Markdown editor, callouts, Unsplash picker, AI-assisted translations,
  scheduling).
- Coach directory backed by real ICF member data, with filters, mode tabs and
  public coach detail pages.
- Events: staff management, published event pages and free RSVP registration,
  translated per locale.
- Operational structure: admin-managed projects, roles and member assignments,
  surfaced as the public team honeycomb and the local communities pages.
- Member Area: a bound member can edit and publish their own profile.
- Staff tooling: member list and detail, roles, vocabularies, Coach Finder
  settings, integration/cutover controls.
- An OAuth-protected MCP server at `/mcp` for assistant access to public data.
- Nightly ICF sync (03:15 UTC) against the **TEST** feed.

**Built but deliberately gated off**

- Member account claiming. The full token flow exists and is exercised via a
  staff-issued link, but self-service claiming stays closed until the LIVE
  cutover; the database refuses to open it before then.
- Member-facing email. Every send is logged and dropped — no transport is
  wired until an email domain is configured.

**Pending for go-live**

See `docs/operations-and-go-live.md` for the checklist, including the LIVE
cutover itself, the email domain, and the custom domain.

## Further documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/code-map.md`](docs/code-map.md)
- [`docs/auth-and-claim-flow.md`](docs/auth-and-claim-flow.md)
- [`docs/public-directory.md`](docs/public-directory.md)
- [`docs/events-team-communities.md`](docs/events-team-communities.md)
- [`docs/europe-pulse.md`](docs/europe-pulse.md)
- [`docs/volunteer-chat.md`](docs/volunteer-chat.md)
- [`docs/operations-and-go-live.md`](docs/operations-and-go-live.md)
- [`docs/tech-debt.md`](docs/tech-debt.md)

Historical planning documents live in `.lovable/`. They record how decisions
were reached but are **not** maintained; `docs/` describes the system as it
actually is.
