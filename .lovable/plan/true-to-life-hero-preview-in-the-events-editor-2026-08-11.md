# True-to-life hero preview in the Events editor

## Problem

The hero designer preview is a simplified mock: a flat Deep Blue box with a bottom-aligned title and truncated summary. The public event hero (`src/pages/EventDetail.tsx`) looks different — back link, large title, lede, date/time/place/language meta row, category and region pills, photo credit, and a directional image wash (`bg-hero/80`, gradient from left on desktop). Marks therefore land in visually different places than authors expect.

## What changes

Extract the public hero's visual layer into one shared presentational component and render that exact component inside the editor preview, scaled down. One markup, two consumers — so the preview can no longer drift from the page.

```text
EventHeroSurface (new, presentational)
├── used by src/pages/EventDetail.tsx      (full width, live data)
└── used by HeroDesignSection preview      (1200px, CSS-scaled to 560px)
        + MarkPlacementCanvas overlay
```

- New `src/components/events/EventHeroSurface.tsx` holds the current hero markup: image + wash, back link, title, summary, meta row, pills, photo credit. It takes plain props (title, summary, image, date strings, place, language, category/region labels, credit) plus a `children` slot for the mark layer, so the CMS can pass placeholder-ish values without touching data logic.
- `EventDetail.tsx` renders that component with its existing values — no behaviour or copy change.
- `HeroDesignSection` renders the same component at the canvas's natural 1200×520 size inside a wrapper with `transform: scale(...)`, so the mark canvas keeps working in percentage space exactly as today.
- Editor preview fills the meta row from the record being edited (start/end, location, language, category/region names already available in the editor), falling back to muted placeholder text where a field is still empty, so authors see realistic text blocks to avoid.
- Article/insight cover preview keeps its current behaviour in this pass; only the event hero gets the shared surface. (Same extraction can follow for articles later.)

## Technical notes

- Scaling uses a fixed-width inner div and `scale = PREVIEW_WIDTH / placement.width`, with `transform-origin: top left` and an outer box sized to the scaled height. Percentage-based mark geometry is unaffected.
- The public hero is currently responsive (`md:` gradient, `md:text-5xl`). The preview renders the desktop composition at 1200px, which is the geometry the mark placement model already assumes.
- No database, RLS, i18n-key or route changes. Existing `hero.*` CMS strings stay as they are.

## PR note

**Summary** — Make the Events hero designer preview render the real public hero component instead of a simplified mock, so hand-placed brush marks appear where they will actually land.

**Changes**
- UI: new shared `EventHeroSurface` presentational component; `EventDetail.tsx` consumes it; `HeroDesignSection` renders it scaled behind the mark canvas.
- No backend, schema, RLS, or i18n changes.

**Backend / Schema Changes** — None.

**Testing & Verification** — Compare the editor preview against `/events/$slug` for an event with and without a cover image, with 0 / 1 / 3 marks; check mark drag, resize, recolour and clear still work; check the public page is pixel-unchanged at mobile and desktop widths.

**Risks & Rollback** — Blast radius is the public event hero markup (moved, not rewritten). Revert is a single-commit revert; no migrations.

**Follow-ups / Known Debt** — Article cover preview still uses the simplified mock; extract an `ArticleCoverSurface` the same way in a later pass.
