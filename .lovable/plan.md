# Dead CTAs on public pages — findings and proposed fixes

An audit of every publicly visible page found seven CTAs with no working target
(all `href="#"`), plus one non-functional newsletter form. Everything else —
nav, footer, audience cards, in-page anchors, all `to="..."` routes — resolves
correctly, and the existing `mailto:` links are all valid.

## Findings

| # | Page | CTA label | Current target | Proposed fix |
|---|---|---|---|---|
| 1 | For coaches — hero | "Become a member" | none (falls back to `#`) | link to the ICF individual-membership page, same URL the page's closing CTA already uses |
| 2 | For coaches — DEIB | "Explore DEIB resources" | `#` | link to the ICF DEIB resource page on coachingfederation.org |
| 3 | For coaches — volunteer | "Get involved" | `#` | link to `/volunteering` (route exists) |
| 4 | For coaches — closing band | "Explore credentials" | `#` | link to `/for-coaches#credentials`, exactly as the homepage's equivalent CTA does |
| 5 | For organisations — hero | "Talk to our team" | none (falls back to `#`) | link to `#organisation-contact`, the contact block already on that page |
| 6 | For organisations — programme cards (all of them) | programme titles | `#` | **mailto `office@coachingfederation.ch`**, subject pre-filled with the programme name — there are no programme detail pages, so an enquiry is the honest next step |
| 7 | Insight detail / Newsletter edition — photo credit | credit text | `#` when the source URL is missing | render as plain text instead of a dead link |
| 8 | Home — newsletter signup | "Subscribe" | form submits nothing (`preventDefault` only) | not fixed here — needs a decision (see question below) |

Where `mailto:` makes sense I propose the chapter address
`office@coachingfederation.ch`, matching how "Propose an event" on the events
page already works (opens the mail client with a pre-filled subject).

## Technical notes

- `CompactHero` in `src/components/chrome/Header.tsx:133` defaults `ctaHref` to
  `"#"`. Change the default to `undefined` and render the hero button only when
  a target is supplied, so a missing target can never ship as a dead link
  again; then pass real targets from ForCoaches and ForOrganisations.
- Fixes land in `src/pages/ForCoaches.tsx`, `src/pages/ForOrganisations.tsx`,
  `src/components/chrome/Header.tsx`, `src/pages/InsightDetail.tsx`,
  `src/pages/NewsletterEdition.tsx`.
- Internal targets use `LocaleLink` so the active language is preserved;
  external links keep `target="_blank" rel="noopener noreferrer"`.
- mailto links use `target="_top"` (existing project convention) and encode the
  subject line; subject text goes through i18n like the events-page precedent.
- No backend, schema, or business-logic changes.

## PR note

**Summary** — Replaces seven placeholder `href="#"` CTAs on the public
marketing pages with real destinations, and makes the shared hero component
incapable of rendering a targetless CTA.

**Changes** — UI only: ForCoaches (4 CTAs), ForOrganisations (hero + programme
cards), CompactHero default, two photo-credit fallbacks. New i18n strings for
the mailto subject lines in all four languages.

**Backend / schema changes** — None.

**Testing & verification** — Click every changed CTA in DE, FR, IT and EN;
confirm internal links keep the locale prefix, anchors scroll to an existing
id, and mailto links open with the right subject.

**Risks & rollback** — Very low blast radius, presentation only; revert the
files to roll back.

**Follow-ups / known debt** — The homepage newsletter form still does nothing
on submit; the programme cards remain enquiry-only until real programme pages
exist.

## Question before building

The homepage newsletter signup (finding 8) currently discards the address.
Should it post to the existing newsletter subscriber storage, send to
`office@coachingfederation.ch` as a mailto, or stay as-is for now?
