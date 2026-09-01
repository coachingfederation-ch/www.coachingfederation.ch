# Move the "Open community details" link into the team results section

Today every community filter chip on `/team` carries its own small arrow link, which
clutters the filter row. Instead, the link becomes a single, clearly labelled CTA that
appears in the results section only when a community is the active filter.

## What changes

- Filter chips go back to being plain filter buttons — no arrow link, no second control
  inside the chip.
- When the active filter is a community, a single CTA appears directly above the
  honeycomb: "Open community details" pointing at `/communities/<slug>`, using the
  design-system `Button` (`variant="outline"`, `size="pill"`, `asChild`) with the
  existing `ArrowUpRight` icon.
- When the filter is "All" or a non-community team, nothing extra shows.
- Only shown in the grid view, not the map view.

## Technical notes

- `src/components/team/TeamGrid.tsx`: strip the `LocaleLink` block and the
  `ArrowUpRight`/`LocaleLink` imports from `TeamFilters`.
- `src/pages/Team.tsx`: derive the active community from `data.projects` (`slug === project`
  and `isCommunity`) and render the CTA above `TeamHoneycomb` inside the results section.
- Reuse the existing i18n key `team.filters.openCommunity` in all four locales; no new
  strings, no data or backend changes.

## PR note

**Summary** — Relocates the community deep-link on `/team` from each filter chip to a
single CTA in the results section, reducing filter-row clutter.

**Changes**
- UI: remove per-chip link in `TeamGrid.tsx`; add conditional CTA in `Team.tsx`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Check `/team` with: no filter, an organizational/project team
filter, a community filter, and the map view; verify the CTA appears only in the last-but-one
case and routes to the right community, in all four languages.

**Risks & Rollback** — Presentation only; revert the two component edits to restore.

**Follow-ups** — None.
