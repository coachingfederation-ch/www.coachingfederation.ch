# Refresh site photography under the new AI image rules

The design system now sets an explicit rule for photography: AI-generated images must follow natural-photography direction (real light, honest expressions, unposed bodies, believable environments — no glossy retouching, no surreal composites), and every AI-generated image must carry a visible "AI generated" badge that ships with the image and is never cropped or faded out. Right now no image on the site carries that badge, and the generated photos read as staged stock.

## What changes

**Audit result — images on the public site**

| Image | Where | Status |
| --- | --- | --- |
| `hero-coaching.jpg` | Home hero | AI generated, staged/stock feel, no badge — regenerate + badge |
| 6 ad tiles (`ad-supervision`, `ad-press`, `ad-assessment`, `ad-practice`, `ad-retreats`, `ad-mentoring`) | Home "Coaching in action" tiles | AI generated, no badge — regenerate + badge |
| `real-conversation.jpg` | not referenced anywhere | delete |
| `leadership-team.jpg` | Home leadership block | real photograph of real people — leave untouched, no badge |
| Article covers, event covers, member/host portraits | CMS-managed | uploaded by staff, out of scope for this pass |

**Regeneration direction (all seven)**

Swiss-plausible settings, natural window light, candid framing, unposed bodies, honest expressions, deliberate diversity of age, background and story. No handshakes, no boardroom stock, no glossy skin. Each generated frame gets checked for hands, eyes and stray text before it is kept; a bad frame is regenerated, not retouched.

**Badging**

Each AI image is rendered through the design system's `AiPhoto` component so the disclosure travels with the picture. On the hero the badge sits where it stays legible and off faces; on the small tiles it sits bottom-left. The team photograph keeps a plain image — badging a real photo would be false.

## Technical notes

- Regenerate into the existing paths (`src/assets/hero-coaching.jpg`, `src/assets/ads/*.jpg`) so imports stay unchanged; delete `src/assets/real-conversation.jpg`.
- `src/pages/Home.tsx`: swap the hero `<img>` and the ad-tile `<img>` for `AiPhoto` from `@/design-system/icf-welcome-design-system-a835df`, keeping current layout classes, `alt` text and lazy loading. Existing overlays/gradients on the tiles must not sit over the badge.
- Each new image is inspected after generation before the pass is called done.
- No copy, routing, data or CMS changes.

## PR note

**Summary** — Regenerate the site's AI-generated photography to the design system's natural-photography direction and add the mandatory AI-generated disclosure badge to every generated image.

**Changes**
- Assets: 7 images regenerated in place, 1 unused image deleted.
- UI: `src/pages/Home.tsx` renders generated photos through `AiPhoto`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Home page reviewed at desktop and mobile widths; badge legibility checked on the hero and on the smallest tile; team photo confirmed unbadged; no other page references the changed assets.

**Risks & Rollback** — Visual only, limited to the home page; revert the commit to restore the previous images.

**Follow-ups** — CMS-uploaded article and event covers are not covered; a later pass could add an "AI generated" flag in the editors so staff-uploaded AI imagery gets the same badge.
