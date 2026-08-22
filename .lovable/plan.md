# Design system gap assessment + upstream prompt

Goal: document where this site deliberately or accidentally diverges from the ICF
Switzerland design system, and produce a ready-to-paste prompt for the design-system
project so the library can absorb those gaps.

## What I checked

- `docs/design-system-deviations.md` (3 recorded deviations)
- `src/styles.css` — thin: Tailwind + one import of the DS stylesheet, no local tokens
  or utilities. All tokens and the six `@utility` classes come from the DS.
- Component inventory: `src/components/**` vs `src/design-system/.../components/**`
- Every `!text-*` / `!bg-*` override and every raw hex in app code
- Chrome: `SiteHeader` / `SiteFooter` are used through thin wrappers, not forked

## Findings (the real gaps)

**1. No on-dark button variant.** Deep Blue bands (hero CTAs, About closing CTA)
cannot use `Button` — `default`/`outline`/`ghost`/`pill`/`pill-ghost` are all built
for light surfaces. Those CTAs stay hand-written anchors. Highest-value gap.

**2. `eyebrow` is not surface-aware.** 6+ places write `eyebrow !text-accent` or
`eyebrow !text-hero-foreground` on Deep Blue. The brand rule (Yellow small text on
Deep Blue) is sanctioned, so the utility should encode it rather than be overridden.

**3. `btn-mono` is not surface-aware either.** 10+ places write
`btn-mono !text-muted-foreground` / `!text-hero-foreground/70` / `!text-teal-foreground`.
The utility bakes in a colour that is wrong in most of its actual uses.

**4. Brush marks: two libraries.** `src/components/marks.tsx` addresses all 30 official
HQ artworks by name (`arrow1`, `asterisk3`, `star2`, …) because stored hero/article mark
placements persist those names. DS `BrushMark` ships a smaller set with no
name-addressable API, so it cannot be adopted.

**5. Missing utilities the site needs.** `lede` (used as a class but not defined by the
DS), and a `mark-placement` positioning primitive.

**6. Missing surface/elevation primitives.** The project keeps local constants
`CARD_SHADOW` and `MENU_ITEM` (`src/components/chrome/constants.ts`) for popover cards
and dropdown rows; the DS has `shadow-soft` but no menu-row or floating-card recipe.

**7. Local `callout.tsx` diverges** from the DS `callout.tsx` — worth reconciling in
one direction.

**8. Not a DS gap (leave as is).** `LinkedInCard.tsx` uses literal `#212251` / `#EFCB30`
because it renders an off-platform social image where CSS variables are not resolvable,
and the Google sign-in mark uses Google's brand hexes. Both are legitimate.

## What this task produces

1. Rewrite `docs/design-system-deviations.md` so each entry maps 1:1 to a numbered gap
   above with its concrete revisit condition (adds entries for `btn-mono`, `lede`,
   the surface primitives, and the callout divergence).
2. Add `docs/design-system-upstream-prompt.md` — a self-contained prompt the user can
   paste into the design-system project, requesting exactly:
   - `Button` variants `inverse` and `inverse-ghost` (on Deep Blue), plus `pill` sizes
   - `eyebrow` and `btn-mono` colour-neutral by default, inheriting `currentColor`, with
     `eyebrow-accent` / on-dark variants
   - a `lede` utility and a `mark-placement` utility
   - `BrushMark` extended to the full 30-artwork HQ set with a name-addressable
     `<BrushMark name="arrow1" />` API and an exported name union
   - a floating-surface / menu-item recipe (`surface-floating`, `menu-item`)
   - the `callout` reconciliation question
   Each request states the concrete usage in this project that motivates it, so the
   library author can judge whether it belongs in the library or stays local.

No application code changes in this task — it is documentation plus an upstream prompt.

## PR note

**Summary** — Documents the delta between this site and the attached ICF design system,
and produces a paste-ready prompt to close the delta upstream. No runtime change.

**Changes** — UI: none. Docs: rewrite `docs/design-system-deviations.md`, add
`docs/design-system-upstream-prompt.md`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Docs-only; verify the build stays clean and that every gap
listed cites a file that still contains the pattern.

**Risks & Rollback** — None; revert the two files.

**Follow-ups** — Once the library ships the variants, migrate the on-dark CTAs, drop the
`!text-*` overrides, and delete the corresponding deviation entries.
