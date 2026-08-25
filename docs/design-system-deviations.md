# Deliberate design-system deviations

The project uses the attached **ICF Switzerland design system** as the source of
components and style values. A handful of places deliberately do something else.
They are listed here so repeat audits stop re-flagging them, and so a reviewer can
check the reasoning without reading chat history.

The rule: a design-system audit finding that matches an entry below is acknowledged
and skipped, with the reason quoted. Anything **not** on this list gets fixed.

Each entry names the condition under which it should be revisited. When that
condition is met, remove the entry and migrate the code — this file is not a place
to park debt indefinitely.

A paste-ready request that would close entries 1–4 upstream lives in
[`design-system-upstream-prompt.md`](./design-system-upstream-prompt.md).

---

## 1. Light-on-dark CTAs are hand-written

**What deviates** — Call-to-action links sitting on a Deep Blue band (`bg-hero`) are
anchors with explicit white / outline styling instead of the design system `Button`.

**Files** — `src/pages/About.tsx` (closing CTA), the hero CTA band in
`src/pages/Home.tsx`, other Deep Blue closing sections.

**Why** — `Button` exposes `default`, `destructive`, `outline`, `secondary`, `ghost`,
`link`, `pill` and `pill-ghost`. All of them are built for light surfaces; none is
legible on Deep Blue. Using `Button` here would mean pushing a white background and
white border through `className`, which overrides the component's skin — exactly what
the design system's own rules forbid.

Scope: buttons on light surfaces **do** use the design-system `Button` (About contact
form submit, the Home case-studies link, `size="pill"`). Only the on-dark case deviates.

**Revisit when** — The design system adds an inverse / on-dark button variant.

---

## 2. `eyebrow` forced to the accent colour on Deep Blue

**What deviates** — Section eyebrows on Deep Blue bands force Yellow or white with
`eyebrow !text-accent` / `eyebrow !text-hero-foreground`.

**Files** — `src/pages/Home.tsx`, `src/pages/About.tsx`, `src/pages/Events.tsx`,
`src/pages/ForCoaches.tsx`, `src/pages/ForOrganisations.tsx`, `src/pages/Insights.tsx`,
`src/components/chrome/Header.tsx`, `src/components/organisations/DeckSection.tsx`,
`src/components/organisations/CultureSurvey.tsx`.

**Why** — The `eyebrow` utility hardcodes `color: var(--color-primary)`, which has no
usable contrast on Deep Blue. ICF brand rules make Yellow-on-Deep-Blue the one permitted
small-text accent pairing, so the override restores a sanctioned pairing rather than
inventing one.

**Revisit when** — `eyebrow` inherits `currentColor`, or the design system ships an
on-dark / accent variant of it.

---

## 3. `btn-mono` recoloured at nearly every call site

**What deviates** — The `btn-mono` utility is almost always paired with a colour
override: `!text-muted-foreground`, `!text-hero-foreground/70`, `!text-teal-foreground`,
`!text-primary`.

**Files** — `src/pages/Events.tsx`, `src/pages/Insights.tsx`,
`src/pages/InsightDetail.tsx`, `src/pages/EventDetail.tsx`, `src/pages/EuropePulse.tsx`,
`src/pages/ForCoaches.tsx`, `src/components/organisations/*`,
`src/components/cms/EventHeroPreview.tsx`, several `_staff` routes.

**Why** — `btn-mono` hardcodes `color: var(--color-primary)`. It is used as a metadata
/ label typeface on bone, white, Deep Blue and teal surfaces, where primary is either
illegible or simply the wrong hierarchy level. The overrides only set colour; the family
and size still come from the utility.

**Revisit when** — `btn-mono` becomes colour-neutral (inherits `currentColor`).

---

## 4. Brush marks use the local mark library

**What deviates** — Decorative brush strokes render through `Mark` from
`src/components/marks.tsx`, not the design system's `BrushMark`.

**Files** — `src/components/marks.tsx`, `src/components/HeroMarks.tsx`,
`src/lib/mark-placement.ts`, the CMS hero designer (`MarkPlacementCanvas.tsx`),
`src/components/cms/LinkedInCard.tsx`, and every public surface that renders placed
marks.

**Why** — Two concrete blockers, both narrower than previously recorded here. The DS
`BrushMark` does ship the same 30 HQ artworks:

1. **Naming.** The DS addresses marks as `Arrow01`, `TextHighlighMark01`,
   `ThinnerStrokeMark04`; the project persists lowercase short names (`arrow1`,
   `highlight1`, `stroke4`, plus a legacy `star` alias) in stored hero and article mark
   placements. Adopting `BrushMark` needs a stable alias map, or every stored placement
   has to be migrated.
2. **Rasterisation.** `BrushMark` paints via CSS `mask-image` pointing at a bundled
   asset URL. The LinkedIn share card rasterises its DOM with `html-to-image`, which
   does not reliably reproduce masked backgrounds; the local `Mark` inlines the SVG so
   the marks survive the export.

**Revisit when** — `BrushMark` exposes an alias/short-name API (or the project migrates
stored placement names) and an inline-SVG rendering mode for rasterised exports.

---

## 5. Literal hex in off-platform artwork

**What deviates** — `src/components/cms/LinkedInCard.tsx` uses literal `#212251`,
`#EFCB30` and an `rgba(33,34,81,0)` gradient stop. `src/routes/staff-sign-in.tsx` uses
Google's four brand hexes in the sign-in mark.

**Why** — The LinkedIn card is rasterised to a PNG that leaves the site; CSS custom
properties resolve inconsistently in `html-to-image`, so the brand values are pinned.
The Google mark is a third-party trademark that must not be recoloured.

**Revisit when** — Never for the Google mark. For the LinkedIn card, when the export
pipeline resolves computed custom properties reliably.

---

## Not deviations (recorded so audits do not re-open them)

- **Callouts** — the former local `src/components/callout.tsx` / `callout-shades.ts`
  shims have been deleted; markdown rendering, the markdown toolbar and the remark
  plugin import `Callout`, `calloutShadeFrom`, `CALLOUT_SHADES`, `SHADE_SWATCH` and
  `CALLOUT_ALIASES` from the design-system barrel.
- **`src/components/chrome/*`** — thin data wrappers around the design system's
  `SiteHeader` / `SiteFooter` shells, exactly as the library intends. The only local
  style constant left is `MENU_ITEM` (a dropdown row recipe the library does not ship).
- **`src/styles.css`** — Tailwind plus a single import of the design system stylesheet.
  The project declares no tokens and no utilities of its own.
- **Font delivery** — the design system now ships the two families same-origin as hashed
  module assets; the project no longer preloads or re-declares them.

---

## Adding an entry

Add one only when all three hold:

1. The design system genuinely has no component, variant, or token that fits.
2. Using the design system anyway would require overriding a component's skin.
3. There is a concrete condition that would make the deviation unnecessary.

Otherwise, use the design system.
