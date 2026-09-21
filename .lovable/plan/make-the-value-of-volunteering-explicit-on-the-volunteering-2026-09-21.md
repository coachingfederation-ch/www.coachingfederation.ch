# Make the value of volunteering explicit on the Volunteering page

The page already explains roles, perks, onboarding and who to contact, but it never states plainly *why* volunteering is worth a member's time. The seven value statements become a visible band near the top, and the existing "What you get back" cards are re-anchored to them so the same message repeats without feeling copied.

## What the member sees

1. **A short value band right under the intro**, before "Open opportunities": a lead line ("Volunteering gives back more than it takes") followed by the seven statements as compact, icon-led items in a grid:
   - Build your network
   - Move through the credentialing process
   - Advance your career
   - Offer leadership development
   - Gain continuous learning
   - Give back to the community
   - Be an extension of the ICF brand

   Each statement carries a short second line of plain copy (one sentence) so it reads as a promise, not a slogan list. Deep Blue band surface so it stands out between the bone page body and the white cards below, in line with the section rhythm used elsewhere.

2. **"What you get back" keeps its four cards** (Free Stuff, Access, Power, Status) but is moved below the value band's logic: the section intro line now names the connection — the four cards are the concrete form the seven promises take.

3. **The opportunity cards gain one value line each** — a small tag row showing which of the seven a role delivers most (e.g. Community Lead → network, leadership development; Content Contributor → ICF brand, continuous learning). Short, muted, not a second heading.

## Copy and i18n

- New `member.volunteering.value` block in `src/i18n/locales/{en,de,fr,it}/cms.json`: `title`, `lead`, and seven entries with `title` + `body`.
- One added line per opportunity: `member.volunteering.opportunities.<key>.valueTags` (a short list).
- One added line for the benefits intro: `member.volunteering.benefits.lead`.
- English is the source; DE/FR/IT follow the existing Member Area tone. Sentence case, no invented statistics or claims.

## Technical notes

- Only `src/components/member/VolunteeringPage.tsx` and the four `cms.json` locale files change. No route, server function, schema or data change.
- The value band renders as a `bg-hero` / `text-hero-foreground` section using existing design-system tokens and lucide icons already imported in the file (plus a few more from the same set). No new colours, sizes or components.
- Tags reuse the existing muted text treatment; no new pill component.
- Verification: build, typecheck, and a signed-in Playwright pass at desktop and 390px width.

## PR note

**Summary** — Adds an explicit volunteer value proposition to the member Volunteering page and links the existing benefit and opportunity cards to it.

**Changes** — UI: new value band and per-role value tags in `VolunteeringPage.tsx`. i18n: `member.volunteering.value.*`, `benefits.lead`, per-opportunity `valueTags` in all four locales.

**Backend / schema changes** — None.

**Testing & verification** — Signed in as a member, open `/volunteering`; check the band renders, all seven statements are present in each language, and the page holds at 390px.

**Risks & rollback** — Content-only, low blast radius. Revert by removing the band, the tag row and the new keys.

**Follow-ups** — Replace the placeholder volunteer quotes with real ones (existing open item).
