# Show the real cover slide in the post preview

Today the branded cover slide is only drawn at publish time: the preview shows an
empty first frame and a note saying "the cover slide is generated when you
publish". Publishers can't see what they're posting until it's live.

## What changes

- The cover slide is rasterised in the browser while the editor is open and shown
  as the first frame of the LinkedIn preview, with the headline, kicker and meta
  exactly as they will be posted.
- It regenerates automatically (short debounce) whenever the headline, meta or the
  cover toggle changes, so the preview always matches.
- While it is being drawn, the first frame shows a quiet loading state instead of a
  blank square.
- A small "Regenerate cover" control lets the publisher redraw it manually if a
  logo or font loaded late.
- The publish action reuses the image already generated for the preview instead of
  rasterising a second time; if none exists yet it draws one, as today.
- The note under the preview is reworded — it now explains the cover is the first
  carousel slide, not that it appears later.

## Technical notes

- `src/components/cms/RecapPostEditor.tsx`: add `coverDataUrl` state, a
  `useEffect` that calls `toPng(coverRef.current, { width/height: RECAP_COVER_SIZE,
  pixelRatio: 1, cacheBust: true })` after a ~300ms debounce on
  `[withCover, headline, eventTitle, meta]`, guarded against races (ignore stale
  results) and unmount. Feed the result into the `slides` array as the cover
  frame's `src`. Publish uses the cached data URL, falling back to an on-demand
  `toPng` call.
- `src/components/cms/LinkedInPostPreview.tsx`: accept an optional `loading` flag
  per slide (or a `coverPending` prop) to render the skeleton state; no other
  behaviour change.
- The off-screen `RecapCoverSlide` stays mounted at full size as it is today, so
  rasterisation quality is unchanged; keep the documented hex-literal deviation.
- New/updated i18n keys in `cms.json` for all four locales: `recap.post.coverNote`
  (reworded), `recap.post.coverRegenerate`, `recap.post.coverRendering`.
- No backend, schema or publishing-contract changes.

## PR note

- **Summary** — Render the branded recap cover slide live in the LinkedIn post
  preview instead of only at publish time, so publishers approve what they post.
- **Changes** — UI: cover rasterisation + loading state + regenerate control in
  `RecapPostEditor`, optional pending state in `LinkedInPostPreview`; i18n: three
  keys across de/fr/it/en.
- **Backend / Schema Changes** — None.
- **Testing & Verification** — Open a recap with photos, toggle the cover on/off,
  edit the headline and confirm the preview frame updates; publish and confirm the
  posted cover matches the preview; verify no cover is sent when the toggle is off.
- **Risks & Rollback** — Contained to the recap post editor; revert the two
  components to restore current behaviour. Small extra client CPU per edit,
  mitigated by the debounce.
- **Follow-ups** — Cover slide is still English-brand-fixed (kicker from i18n);
  per-locale cover variants are out of scope.
