# Structure types in the operational structure screen

## What changes

The "Project type" chooser in **Project details** becomes **Structure type** with three options instead of two:

| Option | Meaning | Public effect |
|---|---|---|
| Organizational Team | Standing committee or board function (renamed from "General project") | Team page only — unchanged |
| Project Team | Time-boxed working group | Team page only — same as today, staff-only distinction |
| Local community | Regional community | Team page plus /communities — unchanged |

Because Project Team is a staff-only distinction, nothing on the public website changes: project teams keep behaving exactly like organizational teams do today.

The staff sidebar list, which today shows two groups (general projects / local communities), gains a third group so the three types read clearly: **Organizational teams**, **Project teams**, **Local communities**. Reordering stays scoped within each group.

## Existing entries

All current non-community entries default to **Organizational Team**. Send me the list of ones that should be Project Teams and I will set them in the same migration; otherwise they can be switched one by one in the UI afterwards.

## Technical notes

- Migration: `ALTER TABLE public.op_projects ADD COLUMN is_project_team boolean NOT NULL DEFAULT false;` plus a check that it is never true when `is_community` is true. No new table, no RLS or grant change. Existing rows default to false.
- `src/components/cms/ops/ProjectForm.tsx`: the two-option radio becomes three; selecting a type writes the `is_community` / `is_project_team` pair, and clears `is_featured_community` when leaving the community type.
- `src/components/cms/ops/ProjectGroupList.tsx`: split the current "general" bucket into organizational vs project teams; keep the community pin icon and the reorder toggle behaviour.
- `src/lib/ops-admin.server.ts` select list and `src/components/cms/ops/types.ts` gain the new column.
- i18n: rename `ops.type.legend` to "Structure type" and `ops.type.general` to "Organizational Team", add `ops.type.projectTeam` + note and the new sidebar group heading, in all four `cms.json` locales.
- Public code paths (`team.server.ts`, `communities.server.ts`, `member-home.server.ts`, `events-admin.functions.ts`) still branch on `is_community` only — untouched.

## PR note

**Summary** — Renames the operational-structure project-type control to "Structure type" and adds a staff-only third type, "Project Team", alongside Organizational Team and Local community.

**Changes** — CMS UI: three-option structure-type control and a third sidebar group; locale keys in four `cms.json` files; new column threaded through the ops admin query and types.

**Backend / schema changes** — One migration adding `op_projects.is_project_team` (boolean, default false) with a consistency check against `is_community`.

**Testing & verification** — Switch a project between all three types and confirm it moves group and that /communities and /team are unaffected for the two non-community types; reorder inside each group; typecheck.

**Risks & rollback** — Low: additive column, no public query reads it. Reverting the code leaves a harmless unused column.

**Follow-ups** — If project teams later need a distinct public presentation, the column is already in place.
