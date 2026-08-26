# Full social post editor for event recaps

Replace the small "Publish to LinkedIn" block in the recap panel with a proper
post editor: a full-screen dialog where staff write the copy, arrange the
carousel, add a branded cover slide, and see exactly how the post will look on
the chapter page before publishing.

## What staff will see

A single button in the recap panel ("Open post editor") opens a full-screen
dialog with two columns:

**Left — compose**
- Commentary field with character counter against LinkedIn's 3,000 limit.
- "Draft with AI" with tone options (Warm, Concise, Celebratory) — generated
  from the recap headline, body, event title and date; the draft lands in the
  field and stays fully editable.
- Cover slide: on by default, showing the branded Deep Blue ICF card (event
  title + kicker) built with the existing card renderer, with a shuffle for the
  brush-mark layout and a toggle to drop it.
- Slides: every gallery photo as a thumbnail with an include checkbox, up/down
  ordering and an alt-text field. Max nine slides including the cover; the
  count and the cap are shown. Order here is independent from the page gallery.

**Right — preview**
- A LinkedIn-shaped post card: chapter avatar, "The Switzerland Chapter of ICF",
  "Just now", the commentary with LinkedIn's "…see more" truncation, then the
  carousel with arrows, slide counter and dots.
- Preview switches between desktop and mobile widths.
- Footer: status ("Not shared yet" / "Posted on …" with a link / last error),
  a "Publish to LinkedIn" primary button on the right, disabled with a reason
  until the recap is published and at least one slide is selected.

Nothing about who may publish changes; the editor is only shown to the same
staff who can publish today.

## Technical notes

- New component `src/components/cms/RecapPostEditor.tsx` (dialog + compose
  column) with `src/components/cms/LinkedInPostPreview.tsx` for the feed
  mock-up. `EventRecapEditor.tsx` keeps only the button, status line and the
  saved commentary; its inline textarea and publish button are removed.
- The cover slide reuses `LinkedInCard`, `LinkedInMarkEditor`,
  `linkedin-visuals.ts` and the `html-to-image` rasterisation already used by
  `LinkedInShareCard`, so the posted cover is exactly the approved artwork.
- `publishRecapToLinkedIn` gains an ordered `slides` input (photo ids + alt
  text) and an optional `coverImage` data URL. `postRecapCarousel` in
  `event-recap-linkedin.server.ts` stops reading photos by `sort_order` and
  instead downloads the named photos in the given order, prepending the cover
  when supplied; the nine-image cap is enforced server-side too.
- Composition state (commentary, chosen slide ids and order, cover on/off,
  mark layout) is persisted on the recap so reopening the dialog restores the
  draft. This is a small JSONB column `linkedin_draft` on `event_recaps` via a
  migration — no new table, no grant or RLS change beyond the existing recap
  policies.
- The AI draft is a new server function next to the recap admin functions,
  using the Lovable AI gateway with the same Gemini model as the other CMS
  drafting helpers, authorised with the existing publisher check. Gateway
  402/403/429 responses surface their own message; no silent retries.
- Copy goes through the existing CMS i18n keys (`recap.*`), DE/FR/IT/EN.
- Design system only: dialog, buttons, badges, inputs from the ICF library and
  brand tokens; the LinkedIn preview chrome is a neutral mock-up built from
  border/muted tokens, not LinkedIn brand colours.

## PR note

**Summary** — Turns the one-textarea LinkedIn block in the event recap editor
into a full social post editor with a live LinkedIn-style preview, ordered
carousel slides, an optional branded cover slide and AI-drafted copy.

**Changes**
- UI: new `RecapPostEditor` dialog and `LinkedInPostPreview`; recap panel block
  reduced to a launcher plus status; new `recap.*` i18n keys in four languages.
- Backend: `publishRecapToLinkedIn` accepts ordered slides and a cover image;
  `postRecapCarousel` posts exactly those, cover first; new AI draft server
  function for recap commentary.
- Schema: `event_recaps.linkedin_draft jsonb` added via migration (nullable,
  no default rows touched).

**Backend / schema changes** — one migration adding a nullable JSONB column;
existing RLS and grants on `event_recaps` cover it, no policy change.

**Testing & verification** — Open the editor on a recap with and without
gallery photos; check the cap at nine slides, disabled publish reasons, AI
draft for each tone, draft persistence across reopen, preview truncation and
carousel paging on desktop and mobile widths, keyboard access to every control.
A real publish is verified against the chapter page with a two-photo recap,
checking cover-first order and the stored post URL.

**Risks & rollback** — Blast radius is the recap LinkedIn block; posting logic
change could reorder a published carousel, so the ordering is verified with one
real post before hand-off. Reverting the code is safe with the column left in
place. Existing posted rows are untouched.

**Follow-ups / known debt** — Other channels (Instagram, Facebook) are out of
scope; scheduling a post for later is not included.
