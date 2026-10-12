# Coaching ROI Simulator (hidden page)

Rebuild the uploaded "Guided ledger" calculator as a page of its own, styled with the attached ICF design system. It stays hidden for now: it has a working web address but no link from the site or menu, it is left out of the sitemap, and search engines are told not to index it. Later, linking to it from For Organisations is a one-line change.

Address: `/for-organisations/roi-simulator` (plus `/de|fr|it/for-organisations/roi-simulator`).

## What visitors see

1. **Compact Deep Blue header.** Title "Build the business case" with the line "Four questions. Then a ledger you can put in front of your CFO."
2. **Four-step guided form**, one question group per step, with Back/Next buttons and a step indicator:
   - Your organisation: number of employees, loaded salary, yearly staff turnover
   - Your programme: choose one of four programme types (Executive 1:1, Team coaching, Manager skills, Coaching culture), then cost per participant and duration. A small box explains how the programme is sized.
   - Today's baseline: engagement %, absence days, replacement cost as a % of salary
   - The case: a plain-language summary sentence and the next-step buttons
   - Global controls: an assumption level (Conservative, Evidence median, Ambitious) and a currency switch (CHF by default, plus EUR and USD)
3. **Live ledger on the right** (stacked under the form on mobile). It shows the investment (including 15% internal time), the seven value drivers each with its visible formula and share of the total, gross return, the overlap discount, year-one net, return multiple, and payback. Sources are named underneath: the ICF/PwC Global Coaching Client Study and ICF + HCI *Building a Coaching Culture*.
4. **Next steps:** "Talk to our team" opens the chapter assistant with an organisations prompt, the same as on For Organisations. "Email me this" and "Download the one-pager" from the example are left out for now (see the open points).

## Redesign against the design system
- The page uses the existing pieces: the compact header, Card, Slider, Input, Label, RadioGroup/ToggleGroup for the choices, Button, Progress for the steps, Tooltip, and the site footer.
- Colours follow the bone/white section rhythm. Value bars use the design system's chart colours instead of the example's indigo and cyan shades.
- Fonts are Quicksand for headlines and Plus Jakarta Sans for everything else, with bold numbers. Nothing in the styling is hardcoded.
- All text is translated in EN/DE/FR/IT. Numbers are formatted in Swiss style for CHF.
- The page is fully keyboard-accessible, every slider has a text label, and the result updates are announced politely to screen-reader users.

## Technical details
- `src/lib/roi-model.ts`: a pure calculation engine ported 1:1 from the example. It contains the programmes, presets, currencies and `compute()`, which returns the drivers, gross, benefit, cost, ROI and payback month.
- `src/lib/roi-model.test.ts`: Vitest checks for the default case (number of participants, overlap discount, 15% internal time, payback) and for currency conversion.
- `src/components/organisations/roi/RoiSimulator.tsx` (state and steps), `RoiLedger.tsx`, and `RoiStepFields.tsx`.
- `src/pages/RoiSimulator.tsx` holds the page. The new route files are `src/routes/for-organisations_.roi-simulator.tsx` and `src/routes/$locale/for-organisations_.roi-simulator.tsx`. The trailing `_` keeps the page from nesting inside For Organisations, so that file is not touched. Each route's `head()` sets the title, description, og tags and `robots: noindex`.
- The sitemap leaves this page out, and no nav or footer link is added.
- New strings go in `organisations.roi.*` in the en/de/fr/it locale files.
- `docs/` gets a new `roi-simulator.md` covering the model, its assumptions, the hidden status, and how to reveal the page.

## PR note
- **Summary:** Adds a hidden, translated Coaching ROI Simulator page built from the example and styled with the ICF design system.
- **Changes:** new page and components (UI), a pure calculation module with tests, translations, and docs.
- **Backend / Schema:** None.
- **Testing & Verification:** unit tests on the model; a browser check of all four steps, the preset and currency switches, the mobile layout, and the noindex tag.
- **Risks & Rollback:** isolated new route with no links to it; to undo, delete the route files.
- **Follow-ups:** linking it from For Organisations; "Email me this" (needs a decision on CRM or email); a branded PDF one-pager; confirming the default Swiss salary and coaching fees (CHF 130,000; CHF 1,400–9,000 by programme type, all taken from the example).
