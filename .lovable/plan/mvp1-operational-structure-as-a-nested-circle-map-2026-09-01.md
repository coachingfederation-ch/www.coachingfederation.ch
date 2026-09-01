# MVP1 — Operational structure as a nested circle map

A read-only, Maptio-style circle view of the chapter's operational structure:
the chapter as one big circle, structure groups inside it, each team as a
circle, each role inside its team, and each person as the innermost dot.

## What it looks like

```text
        ┌───────────── The Switzerland Chapter of ICF ─────────────┐
        │  ( Organizational teams )   ( Project teams )            │
        │    ( Board )                  ( Conference 2026 )        │
        │      (Chair)(Treasurer)         (Lead)(Design)           │
        │  ( Local communities )                                   │
        │    ( Zürich ) ( Romandie ) ( Ticino )                    │
        └──────────────────────────────────────────────────────────┘
```

- Circle size = number of people inside; colour = structure type
  (Deep Blue for organizational teams, Blue for project teams, Light Blue for
  communities), with people rendered as small Bone dots.
- Click a circle to zoom into it; click the background to zoom back out.
  Breadcrumb above the canvas shows where you are and lets you jump back.
- Hover/tap a person shows a small card: name, role, team. Clicking a person
  opens the existing team member modal (same card as /team today) so no new
  personal data surfaces are created.
- Keyboard accessible: every circle is a focusable button with a label, and a
  plain nested list of the same structure is rendered for screen readers and
  for the no-JS/SSR case.

## Where it lives

- Public: a new tab on the existing `/team` page — "Grid" (today's default) and
  "Map". Localised in DE/FR/IT/EN, no new route needed for MVP1 beyond a
  `?view=map` search param so the view is shareable.
- Staff: a read-only "Map" toggle on `/operational-structure` that renders the
  same component from the admin data, so admins can sanity-check the structure
  they are editing.

## Data

No schema change, no new grants. The map is built entirely from the existing
public reads:

- `loadPublicProjects()` — active teams/communities with localised names.
- `loadTeamMembers(locale)` — volunteers with their `assignments`
  (project slug + role name), already privacy-filtered by
  `team_directory_public`.

Grouping into organizational / project / community reuses the same
`is_community` / `is_project_team` pair the CMS uses. `is_project_team` is not
currently in the public projects view's column list — MVP1 adds it to
`PUBLIC_PROJECT_COLUMNS` if the view exposes it; if it does not, project teams
render in the organizational group and a follow-up migration adds the column to
the view.

Known MVP limitation: only roles that currently have at least one person
appear, because empty roles are not part of the public data. The staff-side map
can show empty roles later if wanted.

## Technical notes

- New dependency: `d3-hierarchy` (+ `@types/d3-hierarchy`) for `pack()` layout
  only — no d3 DOM rendering. The SVG is plain React, so it SSRs and is styled
  with design-system tokens (`fill-[var(--color-hero)]` style token classes, no
  raw hex).
- New files:
  - `src/lib/ops-map.ts` — pure builder turning projects + members into a
    `{ name, kind, children }` tree; unit-testable, no I/O.
  - `src/components/team/StructureMap.tsx` — the SVG circle-pack renderer with
    zoom state, breadcrumb, focus handling and the a11y list fallback.
- `src/pages/Team.tsx` gains the Grid/Map tab; `src/routes/team.tsx` and the
  `$locale` twin validate the `view` search param.
- `src/routes/_staff/operational-structure.tsx` renders `StructureMap` in a
  read-only panel from the rows it already loads.
- Motion respects `prefers-reduced-motion` (zoom becomes instant).

## PR note

**Summary** — Adds a read-only, Maptio-style nested circle map of the chapter's
operational structure to the public team page and to the staff operational
structure screen.

**Changes** — UI: new `StructureMap` component, Grid/Map tab on `/team`,
read-only map panel in the CMS; new pure tree builder in `src/lib/ops-map.ts`;
locale strings in four `team.json` files; one new layout dependency.

**Backend / schema changes** — None planned (possible follow-up: expose
`is_project_team` on the public projects view).

**Testing & verification** — Check the map in all four locales, signed-out and
as staff; keyboard-only zoom in/out; screen-reader list fallback; reduced
motion; a team with no assignments and a person with two roles; confirm no
email or phone reaches the map payload.

**Risks & rollback** — Low: additive, read-only, no writes and no new data
exposure. Reverting removes the tab.

**Follow-ups** — Empty roles, vacancy highlighting, and a deep link per team
circle.
