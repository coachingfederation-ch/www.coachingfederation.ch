#!/usr/bin/env bash
# Prove the committed schema baseline can rebuild the database from zero.
#
# Boots a throwaway local Postgres, creates the Supabase prerequisites the
# baseline assumes (roles + auth/storage stubs), replays the baseline and fails
# on the first error. Nothing touches the real project database.
#
#   bun run baseline:verify
#
# Requires a local `postgres`/`initdb`/`psql` on PATH (PGBIN can point at them).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Postgres refuses to run as root; drop to an unprivileged uid and re-exec once.
if [[ "${EUID}" -eq 0 && -z "${BASELINE_VERIFY_DEMOTED:-}" ]]; then
  command -v setpriv >/dev/null || { echo "Run as a non-root user (postgres refuses root)." >&2; exit 1; }
  UID_ALT="${BASELINE_VERIFY_UID:-1000}"
  SCRATCH="$(mktemp -d)"; chmod 777 "$SCRATCH"
  exec setpriv --reuid="$UID_ALT" --regid="$UID_ALT" --clear-groups \
    env BASELINE_VERIFY_DEMOTED=1 PGBIN="${PGBIN:-}" HOME="$SCRATCH" TMPDIR="$SCRATCH" \
    bash "${BASH_SOURCE[0]}"
fi

BASELINE="$(ls "$ROOT"/supabase/baseline/*_baseline.sql 2>/dev/null | tail -1 || true)"
if [[ -z "$BASELINE" ]]; then
  echo "No baseline found. Run: bun run baseline:write" >&2
  exit 1
fi

PGBIN="${PGBIN:-}"
[[ -n "$PGBIN" ]] && export PATH="$PGBIN:$PATH"
for bin in initdb postgres psql; do
  command -v "$bin" >/dev/null || { echo "Missing $bin on PATH (set PGBIN)." >&2; exit 1; }
done

WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "Replaying $(basename "$BASELINE") onto a scratch Postgres…"
initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=" -l "$WORK/pg.log" -w start >/dev/null

# Connect over the socket in $WORK; unset inherited PG* so we never hit the real DB.
run() { env -u PGHOST -u PGPORT -u PGUSER -u PGPASSWORD -u PGDATABASE \
          psql -h "$WORK" -p "$PORT" -U postgres -d baseline -v ON_ERROR_STOP=1 "$@"; }
env -u PGHOST -u PGPORT -u PGUSER -u PGPASSWORD -u PGDATABASE \
  psql -h "$WORK" -p "$PORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
  -c "create database baseline" >/dev/null

# Supabase prerequisites the baseline deliberately does not create itself.
run -q <<'SQL' >/dev/null
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create schema if not exists vault;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create table if not exists storage.buckets (id text primary key, name text not null, public boolean not null default false);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb);
alter table storage.objects enable row level security;
-- Stubs for Supabase-managed helpers referenced by policies.
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
SQL

# Extensions and unavailable-locally objects are skipped, not silently ignored:
# the filtered lines are printed so the reviewer sees exactly what was dropped.
FILTERED="$WORK/baseline.filtered.sql"
grep -vE '^create extension' "$BASELINE" > "$FILTERED"
echo "Skipped (managed by the platform, not replayable locally):"
grep -E '^create extension' "$BASELINE" | sed 's/^/  /'

if run -q -f "$FILTERED" >"$WORK/replay.log" 2>&1; then
  TABLES=$(run -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','private')")
  POLICIES=$(run -Atc "select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')")
  echo "OK — baseline replayed cleanly: $TABLES tables, $POLICIES policies."
else
  echo "FAILED — replay errors:" >&2
  tail -40 "$WORK/replay.log" >&2
  exit 1
fi