# Brush marks: what the earlier note meant, and what the design system should change

## What the comment was about

We have two brush-mark implementations in the project:

- **Ours** — `src/components/marks.tsx`. Thirty ICF SVGs bundled in `src/assets/marks/`, loaded lazily per mark via a Vite glob, inlined into the DOM as `currentColor` artwork. Used by ~20 components and pages (`Home`, `Events`, `EventDetail`, `Insights`, `ForOrganisations`, coach pages, `HeroMarks`, the LinkedIn card, the newsletter block image editor), plus two rasterisers that need the raw SVG string: `src/lib/block-image-render.ts` and `src/lib/linkedin-visuals.ts`.
- **The design system's** — `BrushMark` / `MarkedText`, same thirty marks but served as absolute CDN URLs from R2, painted as CSS masks (or fetched and inlined when `render="inline"`).

The audit suggested replacing ours with the design system's. It is not a drop-in swap for three reasons found in the code:

1. **Stored names.** Mark placements are persisted in the database — `newsletter_blocks.image_marks`, article mark placements, LinkedIn card visuals — as short aliases. Our alias for the ring marks is `circular1/2/3`; the design system's is `circle1/2/3`. Its `MARK_ALIASES` has no `circular*` entry, so every stored ring placement would resolve to nothing after a swap. That is a data migration, not a wiring fix.
2. **Canvas rasterisation.** `block-image-render.ts` bakes a flattened JPEG with marks on it, and `linkedin-visuals.ts` does the same for share cards. Both need an awaitable raw SVG string (`loadMarkSvg`). The design system only offers a React component; `render="inline"` covers DOM-to-canvas via `html-to-image`, but not our direct `canvas` drawing path.
3. **Asset origin.** Our artwork is same-origin and bundled, deliberately, for the Swiss data-protection posture we already applied to fonts. The design system fetches from an external CDN URL, which also risks tainting the export canvas (CORS) in the two rasterisers above.

None of this makes the design system wrong — it just means the swap needs its own pass.

## What the design system should change to make us compatible

1. **Add the `circular1/2/3` aliases** to `MARK_ALIASES` alongside `circle1/2/3`, the same way `star` is kept as a legacy alias. This alone removes the data-migration blocker.
2. **Export an awaitable artwork loader**, e.g. `loadMarkSvg(name: MarkNameOrAlias): Promise<string>`, returning the same sanitised, `currentColor`-forced SVG string `render="inline"` already produces internally. It is a small extraction of the existing `fetchInlineSvg` and unblocks any consumer that draws to a canvas rather than to the DOM.
3. **Offer locally bundled artwork.** Either ship the raw `.svg` files next to the `.asset.json` pointers and resolve them through the bundler, or document a way to point `MARKS[*].url` at self-hosted copies. Needed for same-origin delivery and for untainted canvas exports.
4. **Keep `MARKS` (with width/height) and `resolveMarkName` public** — already the case, and our placement editors depend on the intrinsic ratios.

Items 1 and 2 are the ones that actually gate a migration here; 3 is what lets us retire our local copy entirely rather than keep it for the export paths.

## What we would change here, once the design system ships those

- Delete `src/components/marks.tsx`, re-point the ~20 consumers to `BrushMark`, and swap the `MarkName` type for `MarkNameOrAlias`.
- Re-point `block-image-render.ts` and `linkedin-visuals.ts` at the exported loader.
- No database migration required if alias parity lands upstream; otherwise a one-off rewrite of stored `circular*` values.

No code changes in this pass — this is the assessment you asked for, plus the upstream ask. `docs/design-system-upstream-prompt.md` is where these requests belong; approving this plan adds the brush-mark section to that file.

## PR note

**Summary** — Documents why the brush-mark library was not swapped during the design-system wiring audit and records the concrete upstream changes that would unblock it.

**Changes** — Docs only: a brush-mark section appended to `docs/design-system-upstream-prompt.md`.

**Backend / schema changes** — None.

**Testing & verification** — Documentation review; no runtime behaviour changes.

**Risks & rollback** — None; revert the doc.

**Follow-ups / known debt** — The actual migration off `src/components/marks.tsx` stays open until the design system ships alias parity, an SVG loader, and bundled artwork.
