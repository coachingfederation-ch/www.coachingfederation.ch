# Newsletter block images: crop presets and ICF brush marks

Each block image gets a small studio: choose a layout, frame the picture inside it, and place ICF hand marks on top. What you see in the editor is exactly what is sent by email and shown on the public archive page, because the framed image with its marks is rendered once and saved as a real picture.

## Layout presets

| Preset | Ratio | Max height in the newsletter |
| --- | --- | --- |
| Banner (full width) | 3:1 | 200px |
| Landscape | 16:9 | 360px |
| Square | 1:1 | 440px |
| Portrait | 3:4 | 520px |

The block width in the email is 600px, so each preset's rendered image is capped at that width and at the height above. Changing the preset re-frames the same source picture — it never asks for a new upload.

## Framing

Under the image slot: a preset row, then a framing box showing the picture inside the chosen ratio. Drag to move, a zoom slider to scale, "Reset framing" to recentre. Anything outside the frame is cut off.

## ICF hand marks

The same brush-mark tool the article and event hero designers use, placed directly on the framed image: up to three marks, drag to move, corner handle to resize, three brand colours (Blue, Light Blue, Yellow), remove button. Marks stay inside a safe margin so they never touch the image edge.

## Saving

Pressing "Apply" flattens the framed picture plus its marks into one image, uploads it to the newsletter image folder, and points the block at it. The original picture and the framing/mark settings are kept separately, so the crop and the marks can be reopened and adjusted later without re-uploading. Unsplash credits and the "AI generated" badge follow the flattened image unchanged — a generated illustration stays labelled everywhere.

## Technical notes

**Database** — one additive migration on `public.newsletter_blocks`, all nullable:
`image_original_url text` (the uncropped source), `image_aspect text` (`banner` | `landscape` | `square` | `portrait`), `image_crop jsonb` (`{ xPct, yPct, zoom }`), `image_marks jsonb` (`PlacedMark[]`). No grant or RLS change — existing policies cover the table, and the storage policy for the `newsletters/` prefix added earlier already covers the new objects.

**New model** — `src/lib/block-image.ts`: `BLOCK_IMAGE_PRESETS` (id, ratio, render width/height, max height) and a `createPlacement(...)` instance per preset from the existing `src/lib/mark-placement.ts`, plus `sanitizeBlockMarks`. Mark limit 3, matching the brand rule.

**Cropper** — `src/components/cms/ImageFrameEditor.tsx`, a small pointer-drag + zoom surface written against the existing pointer pattern in `MarkPlacementCanvas`; no new dependency. `MarkPlacementCanvas` is reused verbatim for the mark layer, with the framed image as its `children`.

**Flatten** — `src/lib/block-image-render.ts` (browser only): draws the source image at the crop transform onto a canvas at the preset's render size, then draws each mark by fetching its SVG through the existing `src/components/marks.tsx` loader, recolouring it and rasterising via a data-URL `Image`. Result is exported as JPEG (PNG when the source is a PNG with alpha) and uploaded through the existing `ARTICLE_IMAGE_BUCKET` helper. Supabase storage and `images.unsplash.com` both send CORS headers, so the canvas is not tainted; images loaded with `crossOrigin="anonymous"`. A pasted third-party URL that blocks CORS cannot be flattened — in that case the editor keeps the picture as-is, shows a short note, and disables Apply.

**Wiring** — `BlockImageField` gains the preset row, the framing box and the mark layer; `newsletters.functions.ts` / `newsletters.server.ts` accept and pass through the four new columns; `newsletter-images.server.ts` writes `image_original_url` alongside `featured_image_url` for AI images. The email template (`newsletter-edition.tsx`) and the public page (`NewsletterEdition.tsx`) set explicit `width`/`height` from the preset — no CSS-only cropping, so Outlook renders correctly.

**Copy** — new editor strings added to `cms.json` in `en`, `de`, `fr`, `it`.

## PR note

**Summary** — Newsletter block images can be framed into four standard layouts with capped heights and decorated with ICF brush marks; the framed, marked image is flattened once so email and web render identically.

**Changes**
- UI: preset row, drag/zoom framing box and reusable mark canvas in the block image field.
- Rendering: explicit image dimensions per preset in the email template and public edition page.
- Backend: block save accepts crop, preset and mark data.
- Schema: four nullable columns on `newsletter_blocks`.

**Backend / schema changes** — one additive migration (nullable columns only). No RLS or grant changes.

**Testing & verification** — For each preset: upload, Unsplash pick, pasted URL and AI-generated image — frame, add three marks, apply, and confirm the editor, the email preview and the published page all show the same picture at the same size. Reopen a saved block and confirm the framing and marks are still editable. Confirm a CORS-blocked pasted URL degrades with a message instead of failing silently. Check the AI badge and Unsplash credit still appear.

**Risks & rollback** — Scoped to the newsletter block image field. Reverting the code is safe with the columns left in place; already-flattened images keep working since they are ordinary stored files.

**Follow-ups / known debt** — Flattening happens in the browser, so very large source images take a moment; no server-side fallback. Old blocks saved before this change keep their current image and default to the Landscape preset with no marks until re-framed.
