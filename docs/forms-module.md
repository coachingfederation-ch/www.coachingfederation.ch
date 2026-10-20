# Forms module

Custom forms (registration questions and post-event follow-up forms) are their
own staff area, **Forms** (`/manage/forms`). Events plug forms in; the event
editor shows only a compact list.

## Concepts

- **Library form** (`form_templates`): a reusable form. Name, kind
  (`registration` / `follow_up`), optional intro and thank-you text, and the
  question list stored as JSON in the same shape `saveEventForm` accepts
  (conditions by position, translations included). Staff with admin, editor or
  organizer roles can read and write them (RLS through `private.has_role`).
- **Event form** (`event_forms` + `event_form_questions`, unchanged): the form
  an event actually uses. Adding a library form to an event **copies** it, and
  `event_forms.template_id` records where the copy came from. Editing a library
  form never changes an event that already uses it, so past answers stay
  consistent. "Save to library" in the event builder copies the last saved
  version back out as a new library form.

## Builder

`src/components/forms/FormBuilder.tsx` is used for both scopes:

- Left: the live preview, rendered by the same `FormQuestionFields` used on the
  public pages. Click a question to edit its wording, help text and options in
  place; a "+ Add" between questions inserts one of a chosen type. Questions
  move by drag handle or labelled up/down buttons. "Try it" switches to a fully
  interactive preview where show-only-if rules apply.
- Right (bottom sheet under 768px): tabs **Question** (type, required, rating
  scale, "Show only if X is Y"), **Form** (name, active, automatic sending,
  intro/thank-you, copy questions from library or other events) and
  **Translations** (never the default tab; per-question DE/FR/IT overrides,
  "Translate again now", a "Missing" flag on untranslated questions).
- One save bar: saved/unsaved state, validation issues, Discard, Save,
  Ctrl/Cmd-S. Every save machine-translates first; a failed translation still
  saves the English copy and says so.

State lives in `src/lib/forms/builder-state.ts`. Rules point at their source
question by a client-only `uid`, so reordering keeps rules intact; a rule is
dropped only when its source is removed, moves below it, or changes to a type
that cannot carry one. Positions are produced at the save boundary. Covered by
`builder-state.test.ts`.

## Where things live

| Path | Responsibility |
| --- | --- |
| `lib/forms.functions.ts` | Library CRUD + usage counts (RLS-scoped client) |
| `lib/forms/builder-state.ts` | Builder reducer, conversions, validation |
| `components/forms/FormBuilder.tsx` | Preview, side panel, save bar |
| `components/forms/form-actions.ts` | Event/library persistence glue, attach, copy |
| `components/cms/EventFormsSection.tsx` | Compact list + "Add form" in the event editor |
| `routes/_staff/manage.forms.index.tsx` | Library list |
| `routes/_staff/manage.forms.$id.tsx` | Library form builder |
| `routes/_staff/manage.events.$id_.forms.$formId_.edit.tsx` | Event form builder |

The event creation wizard's "Ask custom questions" extra offers a library
registration form, copied onto the new event at the end of the wizard.

## Known gaps

- Library intro/thank-you translations are not stored; they are produced when
  the copy is saved on an event.
- No template versioning; "used by events" counts copies, not live links.
