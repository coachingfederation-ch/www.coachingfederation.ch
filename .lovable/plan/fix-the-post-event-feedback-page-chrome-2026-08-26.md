# Fix the post-event feedback page chrome

The feedback page at `/form/$token` renders the site header and footer wrongly:
the header's white lockup and light nav sit straight on the bone background
(barely legible), and the footer floats in the middle of the page with an empty
bone band beneath it.

## What's wrong

- `SiteHeaderBar` always renders the design-system header shell with
  `standalone={false}`, which means "I am already inside a Deep Blue band" — it
  drops the band and paints only the white/negative lockup and light nav links.
  That is correct inside `CompactHero`, which supplies the band, but the
  feedback page (and the ticket page, which has the same defect) places the bar
  directly on the bone page background, so the white artwork lands on bone.
- The page wrapper is `min-h-screen` without a column layout, so with a short
  form the footer sits wherever the content ends instead of at the bottom of
  the viewport.

## The fix

- Give `SiteHeaderBar` a `standalone` prop that defaults to the shell's own
  band-drawing behaviour, and keep `standalone={false}` only where the bar is
  nested inside `CompactHero`. On its own, the bar then renders the proper Deep
  Blue band with the negative lockup — exactly as on every other page.
- Change the page shells on `/form/$token` (all three states: form, thank-you,
  invalid link) and `/ticket/$token` to a `flex min-h-screen flex-col` wrapper
  with `flex-1` on `<main>`, so the footer always sits at the bottom.
- Tidy the feedback page itself while there: the eyebrow uses the shared
  `eyebrow` utility rather than a hand-rolled uppercase class, and the card,
  heading and submit button use the design-system `Card` and `Button` instead
  of local class strings, matching the ticket page.

No behaviour, token, or copy changes; palette and typography stay exactly as
the brand system defines them.

## Technical notes

- `src/components/chrome/Header.tsx`: `SiteHeaderBar({ compact, standalone })`,
  passing `standalone` through to the design-system `SiteHeader`; `CompactHero`
  keeps calling it with `standalone={false}`.
- `src/routes/form.$token.tsx` and `src/routes/ticket.$token.tsx`: wrapper and
  component swaps only.
- Verified with a browser pass over a live form token at desktop and mobile
  widths, checking the header band, footer position on short and long forms,
  and keyboard focus order.

## PR note

**Summary** — Fixes the broken site chrome on the public follow-up form and
ticket pages: the header now draws its Deep Blue band when it is not nested in
a hero, and the footer is pinned to the bottom of short pages.

**Changes**
- UI: `SiteHeaderBar` gains a `standalone` prop; `/form/$token` and
  `/ticket/$token` use a flex column shell with `flex-1` main; feedback form
  card, heading and submit button moved onto design-system components.

**Backend / schema changes** — None.

**Testing & verification** — Open a live feedback link in a signed-out browser
at 375px and 1440px: header band and lockup legible, nav and language switcher
readable, footer at the bottom in the form, thank-you and invalid-link states;
same check on a ticket link; submit path unchanged.

**Risks & rollback** — Blast radius is two public pages plus one header prop
with a default that preserves current behaviour elsewhere; revert is a plain
code revert.

**Follow-ups / known debt** — The feedback form's single-choice question still
renders as checkboxes rather than radios; tracked separately.
