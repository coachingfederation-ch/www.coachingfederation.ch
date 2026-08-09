# Schema baseline at cutover

## What you asked

Reduce the migration history to a single "state at cutover" artifact, taken at the
point where the schema is final but no member data exists yet — and decide whether
that belongs inside the cutover automation.

## The short answer

**Do not put it in the cutover automation, and do not make it an app function.**

`runCutover` is a data operation running in the edge worker: archive, purge, switch
mode, first LIVE import. A schema baseline is a *repository artifact* — it has to be
committed and reviewed, which a worker cannot do. Giving an HTTP-reachable function
the right to read the entire catalogue (and later to replay it) also widens the blast
radius of the one endpoint that is already the most dangerous in the system.

It is a **separate engineer-run script**, executed inside the freeze window that
Phase B already establishes, and signed off as a Gate 2 artifact.

## Best point in time

Phase B step 2 already freezes both systems. The baseline goes between that freeze
and the `runCutover` execution:

```text
B.2  freeze Bubble + CMS                     schema final, no member data
B.2a generate baseline  <-- here             commit + store off-repo
B.3  archive snapshot
B.4  runCutover (data only)
B.5  verify
Gate 2: re-run in check mode -> zero drift   proves the cutover changed no schema
```

Why this point and not another:

- It is the only moment where the schema is frozen *and* the member domain is empty,
  so the baseline describes exactly the shape the first LIVE import lands in.
- `runCutover` touches data only, so the same check re-run after Gate 2 must report
  zero drift. That turns the baseline into a cheap assertion about the cutover itself.
- Before Gate 1 is too early: last-minute schema fixes are normal during preparation
  and would invalidate it.

After cutover nothing changes about how you work: new migrations continue as normal
forward migrations. The baseline is *derived*, never hand-edited, and regenerated
whenever you want a fresh one.

## What gets built

### 1. `scripts/schema-baseline.ts` — generator and drift checker

Reads the live catalogue and emits one ordered SQL file. It reconstructs, in
dependency order: extensions, schemas (`public`, `private`), enum types, tables with
defaults and constraints, indexes, views, functions, triggers, RLS enablement, all
139 policies, and every table- and column-level grant. Storage buckets and their
policies are included; `auth`, `realtime`, `vault` and `cron` are declared as
prerequisites, not recreated.

Two modes:

- `--write` — writes `supabase/baseline/<timestamp>_baseline.sql` plus a
  `MANIFEST.json` with object counts and the migration ledger version it corresponds to.
- `--check` — regenerates in memory and diffs against the committed baseline,
  exiting non-zero on drift. This is what runs at Gate 2 and can run in CI later.

### 2. `scripts/verify-baseline.sh` — rebuild-from-zero proof

Because the baseline has to be trustworthy for recovery, it is verified by actually
replaying it. The script starts a throwaway local Postgres, creates the Supabase
prerequisites the baseline assumes (the `anon`, `authenticated`, `service_role`,
`authenticator` roles, a minimal `auth.users` and `storage.objects`, and stubs for
`pg_cron`/`pg_net` where the real extensions are unavailable), applies the baseline,
then runs the same catalogue extraction against it and diffs it against production's.
A clean diff is the pass condition; anything the stubs cannot cover is listed
explicitly in the prerequisites header rather than silently skipped.

### 3. Documentation

- `supabase/baseline/README.md` — what the file is, what it is not (it is not a
  backup and contains no data), the prerequisites it assumes, and how to replay it.
- `docs/operations-and-go-live.md` — the B.2a step, the Gate 2 drift-check row, and
  a note that the archive bundle and the baseline are two different artifacts that
  both have to leave the database.
- `docs/tech-debt.md` — replace the "86 migrations are never squashed / no baseline
  tooling" entry with the actual position: history is kept intact deliberately, the
  baseline is derived on demand.

## What is deliberately not done

- The 87 files under `supabase/migrations/` are left exactly as they are. The
  platform's ledger records each one by version with its full statements, so the
  folder and the ledger stay in agreement and nothing about how migrations are
  applied changes.
- No rewriting of `supabase_migrations.schema_migrations`.
- No new database objects, no RLS change, no application code change.

## PR note

**Summary** — Adds a derived, rebuildable schema baseline generated in the cutover
freeze window, so the database shape at the moment of the first LIVE import is a
reviewable artifact and can be replayed onto an empty project for recovery.

**Changes**
- Tooling: `scripts/schema-baseline.ts` (generate + drift check),
  `scripts/verify-baseline.sh` (replay onto a scratch Postgres and diff).
- Artifact: `supabase/baseline/<timestamp>_baseline.sql` + `MANIFEST.json` +
  `README.md`, generated at cutover.
- Docs: Phase B step and Gate 2 row in the go-live runbook; corrected tech-debt entry.

**Backend / schema changes** — None. Read-only against the catalogue; no migration,
no policy change, no data written.

**Testing and verification** — Generator run against the current database; output
replayed onto a scratch Postgres and the catalogue diffed to empty; `--check` run
twice to confirm it is stable and reports zero drift. Pending until the real window:
the Gate 2 post-cutover drift check.

**Risks and rollback** — Low. Nothing executes against production beyond SELECTs on
system catalogues. Rollback is deleting the scripts and the artifact; the migration
history is untouched, so no rollback of database state is possible or needed.

**Follow-ups / known debt** — Wire `--check` into CI once the baseline exists so
schema drift between the file and the database is caught continuously; decide whether
each later release refreshes the baseline or whether it stays a cutover-only snapshot.
