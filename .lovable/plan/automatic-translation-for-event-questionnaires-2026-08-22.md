# Automatic translation for event questionnaires

Today only the question label has DE/FR/IT boxes in the form editor, and an editor has to type each
translation by hand. Help texts, intro and thank-you texts already have translation columns in the
database but no editor fields, and answer options and rating scale labels have no translations at all.

This change makes a questionnaire fully multilingual with no manual work: when a form is saved, every
empty DE/FR/IT field is filled automatically by the translation service, and every translation stays
editable afterwards.

## What the editor sees

- Saving a registration or follow-up form translates the whole questionnaire in one go: form intro,
  thank-you text, every question label and help text, the answer options of single/multiple choice
  questions, and the low/high labels of rating questions.
- Only empty translations are filled. Anything an editor typed or corrected is never overwritten.
- A short status line while it runs ("Translating questionnaire…") and a note on completion.
- Each question gains collapsible DE/FR/IT fields for help text, options and scale labels next to the
  existing label fields, so any machine translation can be corrected.
- A "Re-translate empty fields" is not part of this change; saving again after clearing a field is the
  way to redo one.
- If the translation service fails, the form is still saved — the editor sees a warning that
  translations could not be generated, not an error.

## What an attendee sees

- Question labels, help texts, choice options, rating scale labels, intro and thank-you text appear in
  the language they are browsing in, falling back to English when a translation is missing.
- The stored answer stays the English option value, so attendee tables, CSV exports, confirmation
  emails and reporting are unchanged and remain comparable across languages.

## Technical outline

Database migration:
- Add `options_de`, `options_fr`, `options_it` (`text[]`), and
  `scale_low_label_de/fr/it`, `scale_high_label_de/fr/it` (`text`) to `public.event_form_questions`.
  Nullable, no grant changes needed (existing table grants cover new columns; verify the grants are
  table-level and not column-scoped before applying, and re-grant per column if they are).

Server:
- New `src/lib/event-form-translations.functions.ts`, modelled on `tier-translations.functions.ts`:
  `assertOrganizer` gate, single Lovable AI Gateway call (`google/gemini-3-flash-preview`,
  `response_format: json_object`), one batched request for the whole form. Input is the set of
  English strings that currently have an empty translation; output is a parallel structure of
  de/fr/it strings. Option arrays are translated positionally and the response is rejected when the
  array lengths do not match, so an option can never silently drift out of alignment.
- `saveEventForm` in `src/lib/event-forms.functions.ts` gains the new columns in its Zod validator,
  `QUESTION_COLUMNS` and its upsert payload.
- `src/lib/event-forms.server.ts`: `toPublicQuestion` resolves `options` per locale via a positional
  lookup, returning both the canonical `options` (submitted values) and a new `optionLabels`
  (displayed strings), plus localised scale labels. `PublicFormQuestion` in `src/lib/event-forms.ts`
  gains `optionLabels: string[]`, `scaleLow`/`scaleHigh` keep their current shape.

Client:
- `src/components/forms/FormQuestionFields.tsx` renders `optionLabels[i]` but keeps
  `options[i]` as the submitted value for single- and multi-choice.
- `src/components/cms/EventFormsSection.tsx`: the draft type carries the new fields; on save the
  editor calls the translation function first, merges the results into the drafts (only where empty),
  then calls `saveEventForm` with the merged payload — the same order the ticket tiers editor uses.
  Adds a per-question translations disclosure and intro/thank-you DE/FR/IT fields.
- New CMS i18n keys in `src/i18n/locales/en/cms.json` plus DE/FR/IT.

Validation is unaffected: `checkAnswer` and `validateSubmission` continue to compare against the
canonical English `options`.

## PR note

**Summary** — Adds automatic DE/FR/IT translation of the entire event questionnaire (intro, thank-you,
labels, help texts, choice options, scale labels) on save, with all translations editable afterwards
and attendees seeing options in their own language while stored answers stay canonical.

**Changes**
- UI: per-question translation fields, intro/thank-you translation fields, save-time translation status
  in the event forms CMS; locale-aware option rendering in the public/follow-up/preview form component.
- Backend: new batched translation server function; extended save validator and columns; locale
  resolution for options and scale labels.
- Config: new CMS i18n strings in four locales.

**Backend / schema changes** — One migration adding nine nullable columns to `event_form_questions`.
No RLS policy changes; grants re-checked and re-granted per column only if the table uses
column-scoped grants.

**Testing & verification** — Create a form with each question type, save, and confirm all DE/FR/IT
fields fill; edit a translation, save again, confirm it is preserved; view the public registration
form and a follow-up form in DE, FR, IT and EN; submit a choice answer in DE and confirm the attendee
table, CSV export and confirmation email show the English value; confirm a save still succeeds when
the translation service is unavailable.

**Risks & rollback** — Blast radius is the event forms editor and public form rendering. Reverting the
code is safe with the columns left in place; they are additive and unused by older code. Main risk is
option/translation misalignment, mitigated by the strict length check that discards a mismatched
response.

**Follow-ups / known debt** — No re-translate-all button; conditions still compare canonical values
(correct, but the condition value picker shows English only); answers already stored before this
change are unaffected.
