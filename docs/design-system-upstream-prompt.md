# Upstream prompt: bring the design system in line with the consuming site

This file is meant to be **copied whole into the ICF Switzerland design-system
project**. It lists the gaps the consuming site (`new.coachingfederation.ch`) has to
work around today, with the concrete usage that motivates each one, so the library
author can decide what belongs in the library and what stays local.

Every gap listed here is currently recorded as a deviation in
[`design-system-deviations.md`](./design-system-deviations.md). Shipping the changes
below lets those entries be deleted and the workarounds removed.

---

## Prompt (copy from here)

I consume this design system in a production site. Everything below is a real
workaround in that site — I would like the library to absorb it so consumers stop
overriding component skins. Please implement these, keeping the library's own rules
(token-driven, no raw values, variants over boolean props, additions exported from
`src/index.ts`).

### 1. `Button`: add on-dark variants — highest priority

The site has large Deep Blue (`bg-hero`) bands: page heroes and closing CTA sections.
Every CTA on those bands is a hand-written `<a>` with white background / white outline
styling, because none of `default`, `outline`, `secondary`, `ghost`, `link`, `pill`,
`pill-ghost` is legible on Deep Blue, and re-skinning `Button` through `className`
breaks the library's own rule.

Please add two variants:

- `inverse` — solid light fill on Deep Blue (white surface, Deep Blue label), the
  on-dark equivalent of `default` / `pill`.
- `inverse-ghost` — transparent with a light border and light label, the on-dark
  equivalent of `outline` / `pill-ghost`.

Both must work with `size="pill"` and with `asChild` (they wrap router `Link`s and
plain anchors), and both need a focus ring that is visible against Deep Blue. Ideally
the pairing is documented as "use on `bg-hero` / `bg-primary` surfaces only".

If a surface-aware approach is preferred over new variants — e.g. a `data-surface="dark"`
or `.on-dark` context wrapper that retunes the existing variants — that works equally
well for us, as long as consumers do not have to pass colour classes.

### 2. Make `eyebrow` colour-neutral

`@utility eyebrow` hardcodes `color: var(--color-primary)`. The site uses eyebrows on
bone, white, teal and Deep Blue surfaces, so roughly a third of call sites read
`eyebrow !text-accent` or `eyebrow !text-hero-foreground` — an `!important` override of
a library utility, on every Deep Blue section.

Please either drop the `color` declaration so the utility inherits `currentColor`
(the family / size / tracking / uppercase treatment is the valuable part), or keep the
default and add `eyebrow-accent` and `eyebrow-inverse` companions. Yellow-on-Deep-Blue
is the ICF-sanctioned small-text accent pairing, so `eyebrow-accent` should encode
exactly that.

### 3. Make `btn-mono` colour-neutral

Same problem, worse ratio: `@utility btn-mono` hardcodes `color: var(--color-primary)`
and virtually every use in the site overrides it — `!text-muted-foreground` for event
and article metadata, `!text-hero-foreground/70` on Deep Blue, `!text-teal-foreground`
on teal cards, `!text-primary` where the default happens to fit.

`btn-mono` is used as a small mono metadata face, not as a link colour. Please make it
inherit `currentColor` and leave colour to the surrounding surface. If a default colour
must stay, please add a neutral companion (`btn-mono-muted` or similar).

### 4. `BrushMark`: the last three things blocking a full migration

Thank you — the short-name aliases (`MARK_ALIASES`, `resolveMarkName`) and the
`render="inline"` mode we asked for previously both shipped, and `MARKS` exposing the
source `width`/`height` is exactly what our placement editors needed.

We still keep `src/components/marks.tsx` locally, because three gaps remain. All three
are small, and closing them lets us delete that component and re-point ~20 consumers.

- **One missing alias family.** Our CMS persisted the ring marks as `circular1`,
  `circular2`, `circular3` long before the library existed; `MARK_ALIASES` maps
  `circle1/2/3` instead. Stored placements in `newsletter_blocks.image_marks`, article
  mark placements and LinkedIn card visuals therefore resolve to nothing. Please add
  `circular1/2/3` as additional aliases for `CircularMark01/02/03`, the same way `star`
  is kept as a legacy alias for `Star01`. Alias parity turns a data migration into a
  no-op for every consumer that has ever stored a mark name.
- **No awaitable artwork loader.** `render="inline"` covers DOM-to-canvas export via
  `html-to-image`, but we have two paths that draw to a `canvas` directly rather than
  rasterising the DOM: the newsletter block-image flattener and the LinkedIn share-card
  renderer. Both need the SVG *string*, not a React element. Please export the loader
  that `render="inline"` already uses internally, for example
  `loadMarkSvg(name: MarkNameOrAlias): Promise<string>`, returning the same sanitised,
  `currentColor`-forced markup with the existing per-URL cache. This is an extraction of
  `fetchInlineSvg`, not new behaviour.
- **Artwork origin.** `MARKS[*].url` points at absolute CDN URLs. We deliver every
  asset same-origin for Swiss data-protection reasons (the same reason our fonts are
  self-hosted), and an external origin also risks tainting the export canvas in the two
  rasterisers above. Please either ship the raw `.svg` files alongside the
  `.asset.json` pointers so a bundler can resolve them, or document a supported way to
  repoint `MARKS[*].url` at self-hosted copies.

Loading behaviour matters: the raw artworks are 120–500 KB each, so whichever mode is
used must stay lazy / per-mark rather than eagerly bundling all 30.


### 5. A dropdown / menu-row recipe

The only style constant the site still hand-maintains is a menu row used by the header
account menu and language switcher — currently
`block min-h-11 px-4 py-3 text-left text-[12px] font-semibold leading-5 text-foreground/80 hover:bg-muted hover:text-foreground`.
It duplicates what `DropdownMenuItem` looks like, but those menus are plain anchors
inside a `shadow-soft` card rather than Radix menus.

Please either export a `menu-item` utility (or a `MenuRow` primitive) with that
treatment, or document that lightweight menus should use `DropdownMenu` with `asChild`
links. Either resolves it; we would rather not own the values.

### 6. One question, no change requested

We keep `src/components/callout.tsx` and `callout-shades.ts` locally as re-export shims
over your versions (identical apart from import paths). Is there a canonical import path
you would rather consumers use, so we can drop the shims?

### What we are explicitly *not* asking for

- Photography or imagery — we generate our own AI photography and mark it with `AiPhoto`
  / `AiBadge` as the library requires.
- Font hosting changes — the hashed same-origin delivery works for us and satisfies
  Swiss data-protection requirements.
- Anything about the site chrome. `SiteHeader` / `SiteFooter` are excellent: every
  string is a prop and we consume them through thin data wrappers with zero style
  overrides.

## Priority order

1. `Button` inverse variants (unblocks the most visible hand-written markup)
2. `eyebrow` / `btn-mono` colour neutrality (removes ~20 `!important` overrides)
3. `BrushMark` `circular*` aliases + `loadMarkSvg` + self-hostable artwork (retires a
   120-line local component and ~20 local call sites)

4. Menu-row recipe (small)
