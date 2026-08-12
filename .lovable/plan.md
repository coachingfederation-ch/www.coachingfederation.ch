# AI writing assistant in the Markdown body editor

Add an "AI" panel to the Markdown editor used by the article body. It offers one-click
actions and a free prompt field, shows the result as a preview, and only changes the
body when the editor accepts it.

## What the editor gets

A new "AI" button in the editor's mode bar (next to Write / Split / Preview) opens a panel
below the toolbar containing:

- Quick actions: Improve writing, Fix grammar & spelling, Shorten, Expand, Continue writing.
- A free prompt field ("Write a short intro about…") with a Generate button.
- Scope indicator: when text is selected, actions work on the selection; otherwise on the
  whole body. Continue writing always works from the end of the current text.

The result appears in a preview area with:

- Generate/Regenerate, and the original prompt still editable.
- **Replace** (swaps selection or whole body), **Insert at cursor**, **Discard**.
- Nothing is written to the body until one of those is pressed, so it is always undoable.

Errors (rate limit, credits exhausted, service unavailable) show inline in the panel in
the editor's language; the draft body is never touched on failure.

## Behaviour details

- Language: the model is told to write in the article's current language (EN/DE/FR/IT),
  Swiss conventions, and to preserve Markdown structure and links — the same conventions
  the existing translation function uses.
- Tone: professional, warm editorial voice for The Switzerland Chapter of ICF; no invented
  facts, statistics or testimonials.
- Long bodies are sent whole; if the body is very long, only the selection is sent for
  selection-scoped actions.

## Technical notes

- New `src/lib/writing-assist.functions.ts`: a `createServerFn` mirroring
  `translations.functions.ts` — `requireSupabaseAuth` middleware, `assertStaff(context)`
  before the paid AI call, Zod-validated input `{ action, prompt?, text, language }`,
  and a call to the Lovable AI Gateway with `google/gemini-3.6-flash`. Returns plain
  Markdown text. Maps 429/402/other statuses to the same user-facing messages already
  used for translation.
- New `src/components/cms/AiAssistPanel.tsx`: presentation + local state (prompt, loading,
  result, error). Receives `value`, `selection`, and `onApply(next)` from the editor.
- `src/components/cms/MarkdownEditor.tsx`: adds the AI toggle to the mode bar, tracks the
  textarea's current selection range, renders the panel, and applies replace/insert through
  the existing `onChange`. No change to Write/Split/Preview behaviour.
- i18n: new `ai.*` keys in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- No database or schema changes.

## PR note

**Summary** — Adds an AI writing assistant (quick actions + free prompt) to the CMS
Markdown body editor, with preview-then-apply so generated text never overwrites work
silently.

**Changes**
- UI: AI toggle and panel in `MarkdownEditor`, new `AiAssistPanel` component, new `ai.*`
  CMS strings in four languages.
- Backend: new staff-gated server function calling the Lovable AI Gateway.

**Backend / Schema Changes** — None.

**Testing & Verification** — Generate with each quick action and a free prompt on a draft
article; verify selection vs whole-body scope, Replace / Insert / Discard, that Discard
leaves the body untouched, error rendering when the service fails, and that a non-staff
account cannot call the endpoint.

**Risks & Rollback** — Contained to the editor; the body only changes on explicit apply.
Revert is code-only.

**Follow-ups / Known Debt** — Title/excerpt and rich-text/event description fields keep no
AI help for now; streaming output is not included (results appear when complete).
