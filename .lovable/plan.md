# Open public surveys from the Forms module

Staff can turn any form into a survey with a shareable web address (for example in a newsletter or email). Anyone with the link can answer it, with no login and no personal invite. Personal invite links come later.

## What staff will see

**1. Surveys in the Forms area** (`/manage/forms`)
- A new tab: "Library forms" | "Surveys".
- Each survey shows its name, status (Draft, Open, Closed), the number of responses and its close date.
- "New survey" offers "Blank" or "Start from a library form" (a copy is made, so the library form stays unchanged).

**2. The survey editor** (`/manage/surveys/$id`)
- The same builder as for event forms (preview, side panel, translations, save bar).
- An extra "Publish" tab in the side panel:
  - Status: Draft / Open / Closed, with an optional opening and closing date and time (Zurich time).
  - Public link with a "Copy link" button and a QR code download.
  - Optional response limit (for example the first 200 answers).
  - "Ask for name and email": off by default, so surveys are anonymous unless staff choose otherwise. When on, a short note tells respondents how their data is used.
  - Optional "one answer per browser" guard (a soft check, not a guarantee).
- "Results" opens the same summary and CSV export already used for event forms.

**3. What respondents see** (`/survey/$slug`)
- Public page in the site's look, in the visitor's language (DE, FR, IT, EN), with intro text, the questions, the show-only-if rules and a thank-you message.
- Clear messages when the survey has not opened yet, has closed or is full.
- Not listed in search engines.

## Safeguards
- Answers can only be read by staff (admin, editor, organizer).
- Submissions are rate-limited per visitor and checked on the server (status, dates, limit, required answers).
- The privacy policy (section 3f or a new short paragraph) gets one sentence about survey answers, in all four languages. Wording will be shown before publishing.

## Technical
- **Schema (additive):** `surveys` (name, slug with random suffix, status, opens_at, closes_at, max_responses, collect_contact, intro/thank-you plus de/fr/it, questions JSONB in the same shape as `form_templates`, template_id) and `survey_responses` (survey_id, answers JSONB, optional name/email, locale, created_at). Grants plus RLS: staff read/write; no anon table access; public read and submit only through server functions using the admin client after checks.
- **Server functions:** `src/lib/surveys.functions.ts` with staff list/get/create/save/delete/results/export (`requireSupabaseAuth` + `assertOrganizer`) and public `getPublicSurvey` / `submitSurveyResponse` (rate-limited via `checkRateLimit`, outcome-neutral errors).
- **Reuse:** `FormBuilder` gains a `scope="survey"` with the Publish tab; `FormQuestionFields` renders the public page; the existing results view and CSV export are adapted to take survey responses; slug generator from `src/lib/articles.ts`; translation via the existing form translation function.
- **Routes:** `src/routes/_staff/manage.surveys.$id.tsx`, `src/routes/survey.$slug.tsx`, `src/routes/_staff/manage.surveys.$id_.results.tsx`; Surveys tab in `manage.forms.index.tsx`.
- **Copy:** `forms.surveys.*` keys in `cms.json` (en, de, fr, it) and public survey strings.
- **Tests:** open/closed/full/date-window rules and the slug rule.
- **Docs:** `docs/forms-module.md` (surveys section), `docs/code-map.md`, `AGENTS.md` rule.

## PR note

**Summary:** Adds open public surveys built with the existing Forms builder, shareable by link, with staff-only results.

**Changes**
- UI: Surveys tab, survey editor with Publish tab, public survey page, results page.
- Server: staff survey functions and rate-limited public read/submit.
- Content: four-locale copy and a privacy-policy sentence.

**Backend / schema changes:** new `surveys` and `survey_responses` tables with RLS and grants. Existing forms and event data untouched.

**Testing & verification:** rule unit tests; as staff create, publish, copy link, answer as a signed-out visitor in two languages, check closed/full states, results and CSV; mobile at 390px.

**Risks & rollback:** additive; code revert leaves unused tables safe in place.

**Follow-ups / known debt:** personal invite tokens for member lists, email sending from the survey, reminders, and stronger duplicate prevention are not in scope.
