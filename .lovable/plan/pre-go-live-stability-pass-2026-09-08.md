# Pre-go-live stability pass

Verified before writing this: `supabase/migrations/` holds 199 files; the only
committed snapshot is `supabase/baseline/20260809065804_baseline.sql`, whose
manifest records 53 tables — well below the current schema; the three commands
`baseline:write`, `baseline:check`, `baseline:verify` exist in `package.json`;
`docs/operations-and-go-live.md` documents the TEST/LIVE switch and the nightly
sync but has no snapshot step in the cutover sequence.

## The recommendation, restated

Do not squash or rewrite the migration history. Each file is applied and
recorded individually by the platform, so rewriting them breaks agreement
between the folder and the ledger and destroys the audit trail. "Stable state"
is achieved by taking a **fresh, verified structure snapshot in the freeze
window immediately before the first live member import**, and proving after the
import that the data event changed no structure.

## What gets done

### 1. Refresh the snapshot
Regenerate `supabase/baseline/<stamp>_baseline.sql` and `MANIFEST.json` from the
current database, replacing the stale August artifact. Confirm the manifest
counts match the live catalogue (tables, policies, functions, triggers, grants).

### 2. Verify it rebuilds
Run the replay check: the snapshot is applied to a throwaway Postgres and must
complete without error. If anything fails to replay, fix the generator (never
hand-edit the snapshot) and regenerate.

### 3. Health and security checks
- Database health snapshot: connections, size, memory, restarts, deadlocks —
  recorded as the pre-import reference point.
- Database linter: review every finding, fix real problems (missing row-level
  protection, over-broad access), and record deliberate exceptions with a reason.

### 4. Add the step to the runbook
Insert into `docs/operations-and-go-live.md` a Phase B step, placed after the
freeze and before the cutover:

```text
freeze both systems        structure final, no live member data
refresh + verify snapshot  <-- new step
health + linter recorded   <-- new step
archive snapshot
run cutover (data only)
verify
gate: re-run drift check -> zero drift
```

Plus a gate row: after the first live import, the drift check must report zero
change, proving the import touched data only.

### 5. Correct the tech-debt entry
Update `docs/tech-debt.md` so the snapshot line reflects the refreshed artifact
and the fact that the stale one was a known gap, now closed.

## Technical notes

- Commands used: `bun run baseline:write`, `baseline:verify`, `baseline:check`.
  All read-only against the project database apart from writing files in the
  repository.
- The snapshot deliberately excludes row data, platform-managed schemas, the
  `auth.users` trigger and scheduled jobs; those stay listed in the snapshot
  README as prerequisites, not silently missing.
- No schema migration, no policy change, no application code change.

## PR note

**Summary** — Establishes a trustworthy pre-import reference state: a refreshed
and replay-verified structure snapshot plus recorded health and security checks,
with the step written into the go-live runbook. Migration history is kept intact.

**Changes**
- Artifact: regenerated `supabase/baseline/<stamp>_baseline.sql` + `MANIFEST.json`;
  stale August snapshot removed.
- Docs: new freeze-window steps and drift-check gate row in
  `docs/operations-and-go-live.md`; corrected snapshot entry in `docs/tech-debt.md`.

**Backend / schema changes** — None. Catalogue reads only.

**Testing & verification** — Snapshot replayed onto a scratch Postgres with no
errors; drift check run twice to confirm it is stable at zero. Linter findings
reviewed individually. Pending until the real window: the post-import drift check.

**Risks & rollback** — Low. Nothing executes against the production database
beyond reads. Rollback is reverting the two doc files and the snapshot artifact.

**Follow-ups / known debt** — Decide whether later releases refresh the snapshot
or whether it stays a cutover-only reference; consider running the drift check
automatically after every migration.
