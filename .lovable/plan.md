# Forms as their own module, with a preview-first builder

Custom forms stop being a long panel inside the event editor. They become a staff area of their own, Forms, with one builder that event pages plug into. The builder combines two earlier directions: the side panel (B) and the editable preview (C).

## What staff will see

**1. A Forms area in the staff sidebar** (`/manage/forms`)
- A library of reusable forms, for example "Workshop registration" or "Post-event feedback". Each row shows the name, its kind (registration or follow-up), the number of questions and the events using it.
- Buttons: "New form" and "Duplicate". Delete sits in a "⋯" menu and always asks for confirmation.

**2. One builder, used everywhere** (`/manage/forms/$id`, and the same screen opened from an event)

```text
+-------------------------------------------+------------------------+
|  Live preview (what attendees see)        |  Side panel            |
|                                           |  [Question] [Form]     |
|  Intro text            (click to edit)    |  [Translations]        |
|  1  What is your role?        * required  |                        |
|     ( ) Coach  ( ) Leader                 |  Type: Single choice   |
|  -------------- + add question ---------- |  Options (one per row) |
|  2  Why are you coming?                   |  Required  [x]         |
|     shown if Q1 = Coach                   |  Show only if ...      |
|  Thank-you text                           |                        |
+-------------------------------------------+------------------------+
|  All changes saved                                     [Save form] |
+--------------------------------------------------------------------+
```

- The left side is the real form as attendees will see it. Click a question's wording to rewrite it in place. Drag a question's handle (or use the keyboard) to move it. A "+" between questions adds a new one from a small type picker.
- The side panel always shows only the selected item, in three tabs:
  - **Question:** type, options, rating scale, required, and the "show only if" rule. The rule reads as a sentence, e.g. "Show only if *What is your role?* is *Coach*".
  - **Form:** name, active, automatic sending, intro and thank-you text.
  - **Translations:** closed by default, since staff rarely change them. A list of German, French and Italian texts, with "Re-translate" and per-field overrides. It also flags items that have changed since they were last translated.
- One Save bar matching the event editor's: saved / unsaved status, Discard, Save, and Ctrl/Cmd-S.

**3. Plugging forms into an event**
- In the event editor's "Custom questions" panel (Registration stage), staff see a compact list: the registration form and any follow-up forms, each with "Edit", "Results" and "Detach".
- "Add form" offers two choices: "Start from a library form" or "Blank form". Both open the same builder, scoped to this event.
- Each event gets its own copy of a library form, so editing one event's questions never changes past events or their answers. "Save back to library" is optional.
- The event creation wizard's "Ask custom questions" step offers "Pick a library form" right away.

The results page, the public form page attendees fill in, automatic sending and CSV export keep working as they do now.

## Accessibility and states

- Everything works by keyboard: moving questions with arrow keys, plus labelled buttons for move up and move down.
- Every control has a readable name, a visible focus ring and a touch target of at least 44px.
- Every state is covered: empty library, empty form, loading, save error (without losing your edits), translating, and "attached to N events".
- Under 1024px wide, the side panel becomes a bottom sheet over the preview.

## Technical

- **New module:** `src/components/forms/`, with `FormBuilder` (preview + side panel + save bar), `FormPreview` (reuses the public form renderer from `src/lib/event-forms.ts`, so the preview and the live form are one source of truth), `QuestionInspector`, `FormSettings`, `TranslationsPanel` and `FormLibraryList`. Only design-system parts (`Sheet`, `Tabs`, `Select`, `Switch`, `Input`, `Textarea`, `Button`, `DropdownMenu`, `AlertDialog`, `Badge`) and ICF tokens are used. The hand-written `inputClass`/`buttonClass` styling goes away.
- **Builder state:** a small reducer (`src/lib/forms/builder-state.ts`) handles add, remove, move, patch, dirty state and discard. It has unit tests for reordering and for show-only-if rules that point at moved or removed questions.
- **Library (schema):** new tables `form_templates` and `form_template_questions`, mirroring the existing question columns, readable and writable by staff with admin/editor/organizer roles through RLS plus grants. Event forms keep using today's `event_forms` / `event_form_questions` tables, so responses, results and public links are untouched. `event_forms` gets a nullable `template_id` to record where a copy came from.
- **Server functions:** a new `src/lib/forms.functions.ts` with list, get, save and delete for templates, `attachTemplateToEvent` (copies into `event_forms`) and `saveEventFormAsTemplate`. The existing `saveEventForm` / `translateEventForm` stay and are called by the builder in event scope.
- **Routes:** `src/routes/_staff/manage.forms.index.tsx`, `manage.forms.$id.tsx`, and `manage.events.$id_.forms.$formId.edit.tsx` (the builder in event scope). A Forms link is added to the staff sidebar.
- **Event editor:** `EventFormsSection.tsx` shrinks to the compact list plus "Add form". The inline `FormEditor` and `QuestionEditor` are deleted.
- **Copy:** a new `forms` namespace in `cms.json` for en, de, fr and it.
- **Docs:** new `docs/forms-module.md`, plus updates to `docs/events-and-ticketing.md` and `docs/code-map.md`.

## Phasing

1. Builder replaces today's inline editor (event scope only). No schema change yet.
2. Forms library, tables, attach from the library, and save to the library.
3. Wizard hook-up and "Re-translate" with change flags.

## PR note

**Summary:** Pulls custom forms out of the event editor into a Forms module with a preview-first builder and a reusable library, so building a questionnaire stops being several nested layers of fields.

**Changes**
- UI: Forms area, a preview builder with a side panel, and a compact forms list in the event editor; the old inline editors are removed.
- Server: template functions plus attach and save-back.
- Content: `forms` copy in four locales.

**Backend / schema changes:** `form_templates`, `form_template_questions` (RLS + grants) and nullable `event_forms.template_id`. Existing data is not touched.

**Testing & verification:** Reducer unit tests. As staff: build a form from blank, attach a library form to an event, reorder questions, add a show-only-if rule, save, re-open, check the public form and results still work, check auto-send on a follow-up form, check keyboard-only use and a 390px width.

**Risks & rollback:** Phase 1 is presentation only and reverts by code. Phase 2's tables are additive and safe to leave if the code is reverted.

**Follow-ups:** Forms outside events (e.g. volunteer applications) can reuse the module later and are not in scope. Template versioning is not in scope.
