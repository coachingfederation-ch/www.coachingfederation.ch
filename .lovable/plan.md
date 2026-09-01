# Community translations: drop the cadence field, fix the AI translate action

## What's wrong

1. **Meeting cadence appears inside each translation block.** Every language card
   (DE / FR / IT) under a community currently shows a small "Meeting cadence" input
   above the translated description, and the AI translation writes a translated
   cadence note as well. The cadence is a short factual line ("Once a month") that
   should be maintained once, in the main community fields — not per language.
2. **"Translate with AI" appears to do nothing.** Confirmed so far: the buttons are
   enabled on the live screen, and translated descriptions do exist for some
   communities, so the wiring is not dead. The failure has not been reproduced yet,
   and the error message the panel renders sits at the very top of the card — far
   above the translation block — so a failing call looks like silence.

## What will change

### 1. Remove cadence from the translation flow

- Community panel: delete the per-language cadence input from each DE / FR / IT
  block. The single "Meeting cadence" field in the main community fields stays.
- Translation server function: drop the cadence note from the prompt, from the
  expected JSON shape, and from the write-back, so a re-run no longer refills it.
- Public rendering: the community pages fall back to the one language-neutral
  cadence value instead of looking for a translated one.
- Existing data: clear the stored `cadence_note_de / _fr / _it` values for all
  communities so nothing stale is shown. The columns themselves stay in place for
  now (removing them is a separate, riskier cleanup).

### 2. Make the translate action honest

- Reproduce a translate click and read the server-function log to identify the real
  cause (missing AI key, credits, model response, permissions). Fix whatever that
  turns out to be.
- Regardless of cause: move the error message next to the translate button of the
  language it belongs to, and show a short success confirmation, so an editor can
  see whether a run succeeded.

## Technical notes

- `src/components/cms/CommunityPanel.tsx` — remove the locale cadence input and the
  `cadence_note` branch of the `localeField` helper; add per-locale status/error.
- `src/lib/community-translations.functions.ts` — remove `cadence_note` from the
  select, prompt, parsed shape, update payload and the returned type.
- `src/lib/communities.server.ts` — read `cadence_note` directly instead of via
  `localizedText`.
- One data statement (not a migration):
  `update op_projects set cadence_note_de = null, cadence_note_fr = null,
  cadence_note_it = null;`
- The buffered-field list in the panel keeps working; the locale cadence keys just
  stop being edited.

## PR note

- **Summary** — The per-language "Meeting cadence" field is removed from the
  community translation blocks and from the AI translation payload; the AI
  translate action gets a diagnosed fix and visible per-language feedback.
- **Changes** — CMS community panel (UI + state), community translation server
  function, public community read helper, per-locale error/success display.
- **Backend / schema changes** — No schema change. One data update clearing the
  three translated cadence columns.
- **Testing & verification** — Switch between two communities, translate into DE,
  FR and IT, confirm the description arrives and no cadence input is present;
  confirm the public community page still shows the cadence line in all four
  languages.
- **Risks & rollback** — Clearing the translated cadence values is not reversible
  from the app; the values are short and re-enterable. Code changes revert cleanly.
- **Follow-ups** — Dropping the unused `cadence_note_de/_fr/_it` columns once the
  new behaviour has run for a while.
