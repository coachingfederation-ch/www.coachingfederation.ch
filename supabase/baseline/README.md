# Schema baseline

A derived, replayable snapshot of the database structure. **Not** a backup and
**not** the source of truth — the migration files in `../migrations/` remain
authoritative and are never squashed.

| Command                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `bun run baseline:write` | Regenerates `<stamp>_baseline.sql` + `MANIFEST.json` from the DB |
| `bun run baseline:check` | Regenerates and diffs; non-zero exit on drift                     |
| `bun run baseline:verify`| Replays the newest baseline onto a scratch Postgres               |

All three read `PG*` (or `PGURL`) and issue SELECTs only. `baseline:verify`
needs local `initdb`/`postgres`/`psql` binaries; point `PGBIN` at them if they
are not on `PATH`.

## What it contains

Extensions, the `private` schema, enum types, functions, tables, constraints,
indexes, views, triggers, RLS flags, policies, schema/table/column grants,
storage buckets and storage policies — for the `public` and `private` schemas.

## What it deliberately does not contain

- Any row data: no members, CMS content, vocabularies or configuration rows.
- Supabase-managed schemas (`auth`, `storage` DDL, `vault`, `realtime`).
- The `auth.users → handle_new_user()` trigger, which lives in the managed
  `auth` schema and must be re-added deliberately.
- `cron.job` entries, which an unprivileged role cannot read. Recreate the
  scheduled jobs from `docs/operations-and-go-live.md`.

`baseline:verify` prints every statement it skipped (platform extensions), so
the gap between "replayed locally" and "the real database" stays visible.

## When to regenerate

During the cutover freeze window (Phase B, step 3a) and after any migration
that changes structure. `baseline:check` is the cheap guard: run it after the
cutover to prove the data event changed no schema.