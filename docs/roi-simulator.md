# Coaching ROI Simulator

Hidden page at `/for-organisations/roi-simulator` (plus `/de|fr|it/...`). It is
not linked from navigation or For Organisations, not in `sitemap.xml`, and its
head carries `robots: noindex, nofollow`.

## Files

- `src/lib/roi-model.ts` — pure engine (programmes, presets, currencies,
  `computeRoi`, `convertCurrency`). Tests: `src/lib/roi-model.test.ts`.
- `src/components/organisations/roi/*` — guided steps, live ledger, formula formatting.
- `src/pages/RoiSimulator.tsx`, routes `for-organisations_.roi-simulator.tsx`
  (trailing `_` keeps it un-nested from the For Organisations page).
- Copy: `src/i18n/locales/*/roi.json`.

## Flow ("guided story")

Eight one-question screens grouped into four named steps (Organisation,
Programme, Baseline, Results) — order and slider ranges live in
`components/organisations/roi/screens.ts`. A live result bar (side card on
desktop, fixed bottom bar on phones) shows return, payback and net. "Use
typical values" jumps to the results page: a Deep Blue headline band, a
36-month payback chart (`paybackCurve` from the model) and the drivers grouped
into People, Performance and Leadership, each expandable to its formulas.

## Pitch deck download

The results page has "Download pitch deck (.pptx)". `roi/pitch-deck.ts`
lazy-loads `pptxgenjs` and builds a 12-slide deck in the browser (no figures
leave the session): title, four evidence slides (copy from
`organisations.deck.slides`), programme scope, headline return, payback chart,
grouped value drivers, ICF standard, measurement, pilot + disclaimer, and a
contact slide (office@coachingfederation.ch, For Organisations, Find a coach).
Strings live under `roi.deck`. Slide colours are literal ICF hex because pptx
cannot read CSS tokens; fonts are Quicksand / Plus Jakarta Sans and fall back
on machines without them.

## Model

Seven value drivers (retention, productivity, engagement, absence, leader
derailment, ramp-up, recruiting load) are computed from organisation inputs and
programme reach, then discounted by an overlap percentage (25/15/10% by
preset). Cost = participants × fee, plus 15% internal time when enabled.
Payback simulates 36 months: benefits ramp in from month two, cost spreads over
the programme length. Defaults (CHF 130,000 salary, fees CHF 1,400–9,000) come
from the design prototype and still need chapter confirmation.

## Launching

Remove the `robots` meta from both routes, add the path to `PATHS` in
`src/routes/sitemap[.]xml.ts`, and link it from `src/pages/ForOrganisations.tsx`.

## Not built yet

"Email me this" and a PDF one-pager (need CRM/branding decisions).
