# Hero design: place brush marks on the hero, in events and articles

Replaces the "Cover image" box in both editors with a **Hero design** section: the background image controls you already have, plus a live preview of the real hero where marks can be dragged, sized, recoloured and deleted — the same interaction as the LinkedIn post builder.

## What the author gets

In the event editor and the article editor:

```text
Hero design
  Background image   URL field · Choose from Unsplash · Remove   (unchanged)
  Preview            the actual hero, at editor scale
  Brush palette      circle · arrow · asterisk · star · highlight bar
```

- Click a brush to drop it on the hero; drag to move, corner handle to resize, swatch row for Blue / Light Blue / Yellow, X or Delete to remove.
- Max three marks, clamped inside a safe margin so nothing is clipped.
- A hint appears if a mark sits over the headline area — allowed, but flagged.
- **Reset to automatic** returns the hero to today's slug-based composition.

The preview is the real hero markup at reduced scale, so what is arranged is what visitors see, including the image wash and title treatment.

## On the public pages

- Event detail hero: if marks are placed they replace the automatic corner + underline marks; with none placed, nothing changes.
- Article detail cover block: same rule, applied to the 16:9 cover; the placeholder tile stays for articles with no image.

## Technical notes

- Generalise the LinkedIn placement model: move `PlacedMark`, `clampMark`, `createMark`, `markHeightPct`, `MARK_COLORS`, `sanitizeMarkLayout` and the size/margin maths out of `src/lib/linkedin-visuals.ts` into a new `src/lib/mark-placement.ts` parameterised by canvas width/height. `linkedin-visuals.ts` keeps its curated suggestions and re-exports, so the LinkedIn builder is unchanged in behaviour.
- Generalise `src/components/cms/LinkedInMarkEditor.tsx` into `src/components/cms/MarkPlacementCanvas.tsx` (palette + drag/resize/colour/delete overlay over arbitrary children). `LinkedInMarkEditor` becomes a thin wrapper so the share dialog keeps working.
- New `src/components/cms/HeroDesignSection.tsx`: image controls (reuse the existing URL input, `UnsplashPicker` trigger and remove button) + scaled preview + canvas. Used by `EventEditorSections.tsx` (replacing the `events.section.image` block) and `ArticleEditorPane.tsx` (replacing the featured-image block).
- New `src/components/HeroMarks.tsx`: renders a `PlacedMark[]` as absolutely positioned `<Mark>` elements in percentage geometry; shared by the previews and by `src/pages/EventDetail.tsx` and `src/pages/InsightDetail.tsx`.
- Schema: `alter table public.events add column hero_marks jsonb;` and the same on `public.articles`. Nullable and additive, existing grants unchanged. Add `hero_marks` to the `events_public` view and to the public article select columns, and to the column lists in `src/lib/events-admin.functions.ts`, `src/lib/events.ts` and `src/lib/articles*.ts`; validate with Zod on write (array, max 3, known mark names, palette colours only) and sanitize on read.
- i18n: new `heroDesign` keys (section title, palette, reset to automatic, overlap warning, colour, remove) in `src/i18n/locales/{de,fr,it,en}/cms.json`.

## PR note

**Summary** — Turns the cover-image box in the event and article editors into a hero designer: same image sources, plus hand-placed brush marks previewed on the real hero and persisted per record.

**Changes** — Shared mark-placement model and canvas extracted from the LinkedIn builder; new hero design section in both editors; public event and article heroes render placed marks with the automatic composition as fallback; new CMS strings in four languages.

**Backend / Schema** — Two additive nullable `jsonb` columns (`events.hero_marks`, `articles.hero_marks`) plus exposure in `events_public`. No policy or grant change.

**Testing & Verification** — Place, drag to edges, resize to both limits, recolour and delete each brush in both editors; confirm the public hero matches the preview at desktop and mobile widths; confirm reset restores automatic marks; confirm events/articles with no marks and no image are unchanged; confirm the LinkedIn share dialog still behaves identically after the extraction.

**Risks & Rollback** — Main risk is the refactor of the LinkedIn placement code; mitigated by keeping the existing exports as wrappers. Revert the touched files; the two columns are harmless if left.

**Follow-ups** — Rotation handle and per-mark opacity, deferred.