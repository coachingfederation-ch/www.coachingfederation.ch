# Ad design choices: three styles per format

Advertisers pick one of three styles in the Content step. The live preview switches as they pick. The chosen style is saved with the request and carried to the placement, so the banner, square and newsletter ads appear in that style once public rendering exists.

## The three styles (same set for banner, square and newsletter)

1. **Editorial** (default, today's look, refined)
   White card, thin border, image in a rounded "window" on the left (banner) or top (square), Quicksand headline, a small "Sponsored" label, and a text link with an arrow. Calm, sits naturally next to articles.

2. **Spotlight** (bold)
   Deep Blue background with the image full-bleed behind or beside it, white headline, logo in its white space, and a solid light button (the on-dark button style). One small Yellow accent: the "Sponsored" label. Best for events and launches.

3. **Warm split** (soft)
   Bone background, large image with fully rounded corners overlapping the edge, logo in a white pill, headline with one Light Blue brush underline, and an outlined pill button. Friendly and human, close to the community pages.

How each format adapts:

```text
Banner (wide)       Editorial: [img | text  link→]
                    Spotlight: [ deep blue text  [Button] | img ]
                    Warm split:[ (round img) text  (pill) ] on bone
Square              Editorial: img top, text below
                    Spotlight: img top, deep blue panel below
                    Warm split: round img inset, bone body
Newsletter          Editorial: email card, small thumbnail
                    Spotlight: deep blue strip with button
                    Warm split: bone block, large rounded image
```

## Picker

- A row of three choice cards ("Editorial", "Spotlight", "Warm split") above the previews, each with a small thumbnail sketch and one sentence. Keyboard accessible radio group, visible focus, 44px targets.
- Previews of all three formats update immediately. Summary step shows the chosen style with an Edit link.
- Staff request detail shows the chosen style.

## Accessibility

- All text pairings follow the fixed brand combinations (no Light Blue text on blue). Contrast checked on every style.
- Brush mark is decorative only; Sponsored label always present in text.

## Technical details

- `src/components/member/AdPreview.tsx`: add `variant: "editorial" | "spotlight" | "warm"` prop; each format renders per variant using tokens only (`bg-card`, `bg-hero`, `bg-background`, `Button` inverse/pill-ghost, `BrushMark`).
- `AdvertiseWizard.tsx`: `ToggleGroup`/`RadioGroup` picker; persist on save/submit.
- Migration: `ad_requests.design_variant text not null default 'editorial'` with check constraint; copied to `ad_placements` on activation. Grants unchanged (existing tables).
- `ads.functions.ts` / activation: accept and validate the value.
- i18n EN/DE/FR/IT labels; docs `docs/advertising.md`; unit test that invalid variants are rejected and the default is editorial.

## PR note

- Summary: advertisers choose one of three ad styles; previews and saved data reflect it.
- Changes: UI preview variants and picker; server validation; staff detail.
- Backend: one column on two tables, default keeps existing rows as Editorial.
- Testing: unit test; Playwright screenshots of all 9 combinations, desktop and mobile.
- Risks/rollback: additive column, safe to leave if code is reverted.
- Follow-ups: public banner/square rendering still not implemented; DE/FR/IT copy needs native review.
