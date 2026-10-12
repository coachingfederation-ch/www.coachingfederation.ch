# ROI Simulator redesign: "Guided story"

Visitors answer one question per screen, with a big number in front of them and a plain "what this means" line underneath. A slim result bar stays visible the whole time. The journey ends on a results page with a headline figure and a payback chart. The calculations, the inputs and the hidden status of the page all stay exactly as they are.

## What changes for visitors

**Step guide.** A row of named steps sits across the top: Organisation, Programme, Baseline, Results. Each has a small icon. Finished steps show a check mark, and visitors can click back to any finished step. This replaces the plain "Step 1 of 4" bar.

**Simpler questions.** Each screen asks one thing, nine screens in all:

```text
Organisation:  1 How many people?  2 Average loaded salary?  3 Yearly turnover?
Programme:     4 Which programme?  5 Cost per person + length
Baseline:      6 Engagement today?  7 Absence days?  8 Replacement cost?
Results:       9 Your business case
```

- The question is set in a large headline, with the current value as a big bold number and the slider below it.
- One short "What this means" line per question, for example: "1,200 people means about 420 join a coaching-culture programme".
- On the programme screen, the four choices become cards with icons. The "how it's sized" box moves behind a "How we size this" toggle.
- The assumption level and currency switch move into a quiet "Settings" row above the questions, so they no longer compete with them.
- A "Use typical values" link skips straight to the results page using the defaults.

**Live result bar.** While visitors answer, a slim bar shows the return multiple, payback month and net figure. It sits beside the questions on desktop and stays fixed at the bottom of the screen on phones. When a value changes, the bar updates gently; this is announced politely to screen-reader users, and motion is turned off for people who prefer reduced motion.

**Results page (step 9).**
- A headline band shows the return multiple (for example "6.3×") at large display size, with the net figure, investment and payback underneath.
- A payback chart shows the cumulative return month by month over 36 months, with the break-even month marked. It uses the chart component already in the design system, in Deep Blue and Yellow.
- The summary sentence follows.
- The seven value drivers are grouped into three cards, each with its own total: People (retention, recruiting, absence), Performance (productivity, engagement) and Leadership (derailment, ramp-up). Each card can be expanded to show the formulas, so all the maths stays visible but isn't overwhelming.
- The page ends with the "Talk to our team" button (the one primary action), plus "Adjust answers" and "Start over" as quieter options.

## Design-system use
- Built from Card, Button (the pill variant for the main action), ToggleGroup, Slider, Collapsible, the chart component, Badge, and lucide icons (already used across the site).
- Background rhythm: the questions sit on white and the results band is Deep Blue. Yellow is used only for the break-even marker and the one main button.
- Type scale: the Quicksand display style for the question and the headline result, small labels for metadata.
- Touch targets are at least 44px, every step in the guide is a real button, and the order is fully keyboard-reachable.

## Technical details
- `roi-model.ts`: add a `paybackCurve` (the monthly cumulative values that `computeRoi` already calculates) to the result. No other change to the maths. Add one test: the curve has 36 points and crosses zero at the payback month.
- Rework `RoiSimulator.tsx` around a list of question screens, each with a field key, slider range, icon and hint builder. New pieces in `src/components/organisations/roi/`: `StepGuide.tsx`, `QuestionScreen.tsx`, `ResultBar.tsx`, `ResultsView.tsx` and `PaybackChart.tsx`. `RoiLedger.tsx` becomes the grouped driver cards. `ProgrammeSizing` is kept and moves behind the toggle.
- The bar widths in the driver cards keep the inline percentage width, because they depend on the data (an existing exception). Everything else uses tokens.
- New strings (question titles, hints, group names, chart labels, settings, "Use typical values") are added in EN, then translated into DE/FR/IT for the `roi` section only.
- Update `docs/roi-simulator.md` with the new flow.

## PR note
- **Summary:** Redesigns the hidden ROI Simulator as a guided, one-question-per-screen story with a live result bar and a visual results page.
- **Changes:** UI components and translations; adds the payback curve to the model output, with a test.
- **Backend / Schema:** None.
- **Testing & Verification:** model tests; Playwright screenshots of every step at 1280px and 390px wide, keyboard tab-through, a currency switch, and the chart's break-even marker.
- **Risks & Rollback:** only the hidden page is affected; revert the component files to undo.
- **Follow-ups:** Email/PDF export; launch link from For Organisations.
