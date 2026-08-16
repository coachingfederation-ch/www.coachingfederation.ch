# Link the research sources in the evidence deck

Today the "Sources and further reading" list under the deck carousel is plain
text. Each entry becomes a link where a public URL exists; entries without one
stay plain text so nothing points at a dead page.

## What changes

- Each source item can carry an optional URL. Items with a URL render as
underlined links that open in a new tab (with the usual external-link safety
attributes and a screen-reader hint that the link opens externally). Items
without a URL keep rendering exactly as today.
- Link colour follows the existing accent-on-deep-blue treatment used elsewhere
in this section, so contrast stays compliant.
- The same structure is filled in for all four languages (DE, FR, IT, EN); the
URLs are identical across locales, only the labels are translated.

## Proposed URLs

ICF research (public, stable):

- ICF Global Coaching Study — [https://coachingfederation.org/research/global-coaching-study](https://coachingfederation.org/research/global-coaching-study)
- ICF Global Coaching Client Study — [https://coachingfederation.org/research/](https://coachingfederation.org/research/)
- ICF Building Strong Coaching Cultures — [https://coachingfederation.org/resources/resource-library/](https://coachingfederation.org/resources/resource-library/)

Workplace research: the two entries are generic category labels ("Global
workplace engagement reports", "Swiss labour market and skills reporting")
rather than named publications, so there is no single correct target.

Chapter items ("Chapter member survey", "Organisational briefing 2026") have no
public page in this site today.

## What I need from you

1. Confirm the three ICF links above, or send the exact pages you want (the ICF
  research library moves pages occasionally, so your confirmed URLs win over my
   guesses).
2. For the two workplace-research entries: either the specific report URLs (for
  example a named engagement report and a named Swiss skills/labour report), or
   tell me to leave them unlinked.  
  Global Workplace: [https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx](https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx)  
  Swiss Labour report: [https://www.adeccogroup.com/en-ch/future-of-work/job-index](https://www.adeccogroup.com/en-ch/future-of-work/job-index)
3. For the chapter entries: a URL each, or leave them unlinked.  
Leave unlinked

Anything you don't provide simply stays as plain text — the page still works.

## Technical notes

- Files touched: `src/components/organisations/DeckSection.tsx` and
`src/i18n/locales/{en,de,fr,it}/organisations.json`.
- `organisations.deck.sources[].items` changes from `string[]` to
`(string | { label: string; url?: string })[]`; the renderer handles both, so
a locale that still has plain strings keeps working.
- Presentation and content only — no data, routing or backend changes.

## PR note

**Summary** — Makes the deck's "Sources and further reading" entries clickable
where a public source URL exists, so organisational readers can verify the
evidence behind the slides.

**Changes**

- UI: source list items render as external links when a URL is present.
- Content: source URLs added to the four locale files.

**Backend / schema changes** — None.

**Testing & verification** — Expand the sources panel on `/for-organisations` in
all four languages; confirm links open in a new tab, keyboard focus is visible,
and unlinked entries are unchanged.

**Risks & rollback** — Low, presentation only; revert by removing the URLs from
the locale files.

**Follow-ups** — Replace generic workplace-research labels with named,
citable publications once chosen.