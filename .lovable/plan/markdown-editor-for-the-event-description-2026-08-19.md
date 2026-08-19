# Markdown editor for the event description

Replace the small WYSIWYG description field in the event editor with the same
editor used for articles — toolbar, AI assist, and a preview toggle instead of
a permanent split view.

## What changes for editors

- The Description field in **Event content** becomes the full article-style
  Markdown editor: formatting toolbar, AI writing assistant, and a
  Write / Preview switch (no side-by-side split for this field).
- The preview renders exactly like the public event page.
- The translations panel description field gets the same treatment, so an
  edited German or French description behaves like the source.
- Existing descriptions keep working: the current content is a Markdown subset
  already, so nothing needs converting.

## Rendering on the public page

The event page currently renders descriptions through the reduced rich-text
renderer, which only understands bold, italic, lists and three heading levels.
Once the richer editor is available, links, tables, quotes and callouts would be
written but not rendered. So the event detail page switches to the same
Markdown renderer articles use.

## Technical notes

- `src/components/cms/MarkdownEditor.tsx`: add an optional `modes` prop
  (defaults to the current write/split/preview set) so callers can request just
  write/preview. Default mode falls back to `write` when `split` is unavailable.
- `src/components/cms/EventEditorSections.tsx` (`EventContentSection`): replace
  `RichTextEditor` with `MarkdownEditor` for `event.description`, passing
  `language={event.language}` and `modes={["write","preview"]}`.
- `src/components/cms/translations/GenericTranslationsPanel.tsx`: render the
  `rich` field type with the same `MarkdownEditor` configuration.
- `src/pages/EventDetail.tsx`: swap `RichTextView` for `Markdown` on the
  description block, keeping the surrounding layout classes.
- No database, RLS or server-function changes; no new i18n keys (toolbar and AI
  labels already exist in `cms.json`).
- `RichTextEditor` stays in place for coach profiles, communities and member
  profile sections.

## PR note

- **Summary** — Uses the article Markdown editor for event descriptions with a
  write/preview toggle, and renders event descriptions with the full Markdown
  renderer so the editor and the public page agree.
- **Changes** — UI: event content section, generic translations panel, editor
  mode prop, event detail rendering. No backend changes.
- **Backend / Schema Changes** — None.
- **Testing & Verification** — Edit an existing event description, check
  preview matches the public page, run a translation and edit it, confirm coach
  profile and community rich-text fields are untouched.
- **Risks & Rollback** — Low; presentation only. Revert the four files to roll
  back — stored content stays compatible either way.
- **Follow-ups** — Optional later: allow the split mode on wide screens for the
  description if editors ask for it.
