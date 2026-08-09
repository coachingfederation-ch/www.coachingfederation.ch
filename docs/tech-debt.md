# Known technical debt

Honest inventory as of the consolidation pass. Nothing here is breaking; all of
it is worth knowing before you build on top of it.

## Duplicated public route files

Every public page exists twice: `src/routes/about.tsx` and
`src/routes/$locale/about.tsx`. Both are thin and render the same component
from `src/pages`, so the duplication is shallow — but adding a public page
means remembering to add both, and forgetting produces a page that 404s in
three of four languages.

_Ideal:_ a single route factory, or an optional locale segment. Deferred
because the current shape is explicit and TanStack's generated route tree makes
the mistake visible quickly.

## Large components

`MemberProfileEditor.tsx`, `articles.$id.tsx`, `manage.events.$id.tsx` and
`operational-structure.tsx` are the oversized files. All are genuinely
form-heavy rather than tangled, and their data access sits behind server
functions, which was the part that actually mattered. Splitting them into
per-section subcomponents is the obvious next step and is low risk.

## Test coverage

There is no automated test suite. Verification has been manual plus browser
automation. The highest-value first tests, in order:

1. `member-sync.server.ts` diffing and the feed drop guard — the code with the
   worst failure mode and the most branches.
2. `publishBlockReason` — a pure function guarding a security-relevant rule.
3. The claim token state machine — expiry, reuse, attempt limits.

## Public projections must be updated by hand

Adding a field to a coach profile requires changing both the table and
`coach_directory_public`; the team page additionally needs
`private.team_directory_rows()`. Nothing catches the omission — the field just
renders blank publicly. Keep the changes in the same migration.

Related: because `anon`/`authenticated` hold column-level grants on
`public.members`, a new column is **not** publicly readable until it is granted
explicitly. That is the intended default; grant only what a public page needs.

## Translation surfaces are copy-adjacent

Articles, events, coach profiles and communities each have their own
translation table, panel and AI translate function. The shape is deliberately
repeated rather than abstracted, but a fifth translatable entity would justify
extracting the shared panel and the `manually_edited` / `is_ready` state
machine.

## Rate limiting is ad-hoc

`rate-limit.server.ts` counts hits in the `api_rate_limits` table over a
sliding window and fails open on any database error. It is deliberate but
coarse: a row per request, opportunistic cleanup, and per-IP subjects that a
distributed caller can spread across. It covers the assistant, the claim form
and the two anonymous ingestion forms. A platform primitive should replace it
when one exists.

## Accepted security risks

- `.env` / `.env.development` are tracked and contain only publishable values
  (Supabase URL and publishable key, project id, analytics id). They are
  platform-generated and required at build time; no confidential value belongs
  in them.
- The generated MCP routes set `trustForwardedHost`, and the email preview
  route authenticates the platform with the shared `LOVABLE_API_KEY`. Both are
  platform-owned behaviour behind the edge proxy.
- The migration files are never squashed: repeated grant/policy reassertions are
  defensive, and the platform ledger keys off the applied files. Instead of
  squashing, `bun run baseline:write` derives a replayable schema snapshot into
  `supabase/baseline/`, `baseline:verify` proves it rebuilds an empty Postgres,
  and `baseline:check` fails on drift. The baseline is documentation and
  disaster recovery, not the source of truth, and holds no data.
- CSP is report-only in `src/server.ts` until a clean report pass justifies
  enforcement.

## i18n dictionary drift

Four dictionaries are maintained by hand. Nothing enforces that a key added to
`en` exists in `de`, `fr` and `it`. Missing keys fall back rather than crash, so
drift is silent. A key-parity check in CI would close this cheaply.

## Route-level Supabase access

The Insights CMS was the last place calling Supabase directly from a route
component; it now goes through `articles.functions.ts`. File uploads
deliberately remain on the browser client, since pushing file bytes through the
RPC boundary would be worse — storage RLS is the boundary there, and the
policies are in place.

## Accepted lint warnings

`eslint .` is clean of errors and the repo is Prettier-formatted. Seventeen
warnings remain and are deliberate:

- `react-refresh/only-export-components` on shadcn `src/components/ui/*` files
  and `src/i18n/index.tsx` — these export components alongside variants,
  constants or hooks. Splitting them would fight the upstream shadcn shape for
  a dev-only fast-refresh hint.
- Two `react-hooks/exhaustive-deps` warnings on `useMemo` calls whose omitted
  `lookup` dependency is a stable module-level map; adding it would only churn
  the memo.

Two `no-control-regex` sites (`member-profile.server.ts`,
`member-translations.server.ts`) carry a scoped disable with a comment:
stripping control characters from pasted text is the whole point of those
sanitizers.

## Historical planning documents

`.lovable/plan*.md` records how decisions were reached across several
revisions. They are useful archaeology and actively misleading as
specifications, because they describe intermediate states. `docs/` is the
current description; prefer it, and do not update the plan files.
