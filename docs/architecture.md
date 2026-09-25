# Architecture

How the system is layered, and — more usefully — where each rule is actually
enforced. When two layers seem to disagree, the database is the authority.

## The four layers

```text
  browser                        edge worker                   postgres
  ─────────────────────────      ─────────────────────────     ────────────────
  routes + pages + components    server functions              tables
  TanStack Query                 (*.functions.ts)              RLS policies
  supabase browser client   ──►  server-only logic       ──►   views
  (RLS as the signed-in user)    (*.server.ts)                 security-definer fns
                                                               triggers
```

There is no separate backend service. Anything that needs a secret, the
service role, or the ICF SOAP feed runs in a server function on the edge
worker. Anything that only needs the signed-in user's own permissions may run
in the browser directly against Supabase, because RLS is the boundary.

## Enforcement lives in the database

This is the single most important thing to understand before changing access
behaviour. The UI hides things; the database refuses them. Every rule below is
enforced in Postgres, and the TypeScript merely mirrors it for a better user
experience:

- **Roles.** Stored in `user_roles`, never on a profile row. Checked through
  the security-definer functions `private.has_role`, `private.is_editor` and
  `private.is_staff`, which RLS policies call. They live in the `private`
  schema, which PostgREST does not expose, so they are not callable as RPC
  endpoints — a signed-in user cannot probe another account's roles.
  Application code checks roles by reading `user_roles` through the caller's
  own client (`src/lib/authz.ts`). A user cannot grant themselves a role,
  because `user_roles` has no insert or update policy at all — role changes
  are service-role only.
  A policy must never inline `EXISTS (SELECT 1 FROM user_roles ...)`. The
  subquery is evaluated as the calling role, and `anon` has no grant on
  `user_roles`, so the whole request fails with `42501` — including every
  embedded read that joins the table. Always call a `private.*` helper, and
  split the policy by role when only signed-in users need the role check
  (see `public.categories`).
- **Article and event access.** Editors and admins manage every article;
  organizers manage events only. Anonymous visitors see published rows only.
  This is why the CMS can safely operate through ordinary authenticated
  clients: an organizer physically cannot touch an article.
- **Public PII.** `anon` and `authenticated` hold column-level grants on
  `public.members`, not table-level SELECT, so member email and phone cannot be
  read from the browser at all. Contact email is exposed only by
  `private.directory_contact_email`, which honours the coach's opt-in.
- **Directory eligibility.** A profile may only be `published` if its member is
  active _and_ holds a valid ACC/PCC/MCC credential. This is a trigger
  (`tg_directory_profile_eligibility_guard`), not a check in application code,
  so the sync engine, the member editor and staff tooling are all bound by it.
- **Integration safety.** `tg_integration_config_guard` makes TEST mode
  incapable of sending member email or opening account claiming, and makes the
  TEST→LIVE transition a one-way door. Setting the wrong flag raises an
  exception rather than quietly emailing 500 members.
- **Who may hold an access right.** The `user_roles` grant policy requires the
  target account to be either a claim-linked member (`private.has_role(user_id,
  'member')`) or a live `internal_accounts` row. Staff accounts created outside
  the Roles screen's invite flow therefore need an `internal_accounts` marker,
  otherwise every role toggle fails with "Could not grant access." A migration
  (2026-09-18) backfilled the legacy accounts that predated the invite flow.

If you need to relax one of these, change the policy or trigger. Do not add a
bypass in TypeScript.


## Server boundaries

Three ways to reach the server, chosen by who is calling:

**1. Server functions (`src/lib/*.functions.ts`)** — the default. Typed RPC
called from components via `useServerFn`, or from a loader. Protected ones
carry `.middleware([requireSupabaseAuth])`, which puts an authenticated
`supabase` client plus `userId` on `context`; queries through it run as the
user with RLS applied.

**2. Public server functions** — no middleware, therefore a public endpoint on
the published site. Used for reads that anonymous visitors legitimately make
(the coach directory, published Insights). These use a _publishable_ client
from `src/lib/supabase-public.server.ts`, never the admin client, so RLS still
constrains them.

**3. File routes under `src/routes/api/public/`** — raw HTTP for external
callers. Only one exists: `member-sync.ts`, the endpoint the nightly cron job
hits. This prefix bypasses site auth, so the handler verifies the caller
itself.

### Security-definer functions instead of definer views

Where a public read needs data that RLS would otherwise hide (the team page
shows members whose coach profile is not published), the projection goes in a
`SECURITY DEFINER` function in the `private` schema, and the public view over it
stays `security_invoker = on`. Definer _views_ are flagged by the database
linter and hide which privileges are actually in play; a narrow definer function
with an explicit column list does the same job visibly. See
`private.team_directory_rows()`.

### The admin client

`supabaseAdmin` bypasses RLS entirely. It is used only where there is no
alternative — the ICF sync writing member rows, signing storage URLs for
anonymous visitors, and role-gated staff mutations. Two rules:

- Import it **inside** the handler (`await import(".../client.server")`), never
  at the module scope of a `*.functions.ts` file, because module scope of those
  files ships to the browser bundle.
- Authorize the caller _before_ reaching for it, and authorize through the
  user's own client. Never use the admin client to decide whether someone is an
  admin.

## Data flow: a public coach search

Worth tracing once, because it touches every layer and shows the view-first
pattern:

1. `src/routes/find-a-coach.tsx` renders `CoachDirectory`.
2. The component reads filters from the URL (they are shareable state) and
   calls `queryCoachDirectory`, a public server function.
3. That function queries `coach_directory_public` — a view, not the base
   tables. The view is the projection boundary: it exposes only safe columns
   and only reveals a member's email when they explicitly opted in.
4. Filtering, faceting and pagination happen in Postgres, not in JavaScript.
5. Profile images live in a **private** bucket, so the function mints
   short-lived signed URLs through `src/lib/storage.server.ts` before
   returning. This is the one place the admin client appears on a public path,
   and it is scoped to signing paths that the view already deemed public.

## Internationalisation

Locale is a path prefix, chosen for SEO: English is unprefixed, the other three
live under `/$locale`. Each public page has both an unprefixed route and a
`$locale` mirror; both render the same component from `src/pages`. Use
`<LocaleLink>` rather than `<Link>` in shared UI so links keep the visitor in
their language.

Interface copy lives in JSON dictionaries under `src/i18n`. Article content is
different: translations are rows in `article_translations`, keyed by locale,
with a `manually_edited` flag so an AI-generated draft is never allowed to
overwrite a human edit.

## Conventions worth following

- **Filename suffixes are load-bearing.** `*.server.ts` is blocked from client
  bundles by filename; `*.functions.ts` is the only sanctioned bridge.
- **Shared rules get one home.** Publish eligibility is
  `publishBlockReason` in `directory-eligibility.ts`; bucket names and URL
  lifetimes are in `storage.ts`. If you find yourself re-deriving one of these,
  import it instead.
- **URL as state.** Directory filters, mode tabs and pagination live in the
  query string so results are linkable and the back button behaves.
- **Never edit** `src/routeTree.gen.ts` or anything in
  `src/integrations/supabase/` — both are generated.

## Agent integrations (MCP)

The app exposes an MCP server at `/mcp` (`src/lib/mcp/`), so assistants such as
ChatGPT, Claude or Cursor can query the site. Access is OAuth 2.1: the client
registers dynamically with Supabase Auth, the user approves it on
`/.lovable/oauth/consent`, and every tool forwards that user's bearer token to
PostgREST — RLS decides what is visible, exactly as in the browser. No
service-role key is used.

Tools: `search_coaches`, `get_coach_profile` (published directory) and
`list_insights`, `get_insight` (published articles). Routes under `src/routes/mcp.ts`,
`src/routes/[.mcp]/…` and `src/routes/[.well-known]/…` are generated by
`mcpPlugin()` — never edit them by hand.

## Database load tuning (2026-09)

- Indexes: `events(starts_at DESC)`, `event_hosts(profile_id)`, `op_assignments(role_id)` for unfiltered event lists and FK lookups.
- Query cache: the shared QueryClient (`src/router.tsx`) defaults to `staleTime: 30s` and `refetchOnWindowFocus: false`; screens needing fresher data override per query or invalidate after mutations.
- Cron: `europe-pulse-advance-5min` now runs every 15 min (stale-run reaper is 90 min, so still safe) and `event-follow-ups-10min` every 30 min. Job names were kept to avoid breaking references.
