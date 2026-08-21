# Retire the old local UI component copies

The project still carries a second, older copy of the shadcn component set in `src/components/ui/`, running in parallel with the attached design system. That copy misses the design system's brand variants (the pill buttons, the token-backed shadows), so anything built on it drifts away from the ICF look. This removes it.

## What changes for you

Nothing visible. The seven screens that still use the old copies — the AI assistant widget and its prompt input, the LinkedIn share card, the staff registration dialog, the markdown toolbar, the Unsplash picker and the event editor — switch to the identical design-system components. Same dialogs, same menus, same behaviour, now styled from the brand tokens.

## Scope

Only seven app files import the old copies. Everything else is already on the design system.

```text
src/components/assistant/AssistantWidget.tsx      alert-dialog
src/components/ai-elements/prompt-input.tsx       command, dropdown-menu, hover-card,
                                                  input-group, select, spinner, tooltip
src/components/cms/LinkedInShareCard.tsx          dialog
src/components/cms/StaffRegistrationDialog.tsx    dialog
src/components/cms/MarkdownToolbar.tsx            popover
src/components/cms/UnsplashPicker.tsx             dialog
src/components/cms/EventEditorSections.tsx        alert-dialog
```

The remaining `src/components/ui/*` files only import each other, so once these seven are repointed the directory has no inbound references.

## Technical section

1. Repoint the imports in the seven files above to `@/design-system/icf-welcome-design-system-a835df`, checking each exported name against that package's `index.ts` before switching (all ten components used are exported there).
2. Keep `src/components/ui/sonner` in place if the root toaster still points at it; verify before deleting, since the template's toast wiring lives at that path.
3. Delete `src/components/ui/` once a repo-wide search shows no remaining references (including `components.json` aliases, which get updated to the design-system path).
4. Run typecheck and a build, then click through the assistant widget, the markdown toolbar popover, the Unsplash picker and the event editor's confirm dialog in the preview to confirm the interactions still work.

No backend, schema, or i18n changes.

## Not changing

- The About page's Deep Blue CTA links stay hand-styled. The design system has no light-on-dark button variant, and forcing one would mean overriding the component's own skin with white/30 borders — exactly what the design-system rules forbid.
- The homepage audience tiles stay as anchors in a one-pixel-gap grid. Wrapping them in `Card` would reintroduce the card's own border and radius and break the seamless divider grid.
- `CARD_SHADOW` already resolves to the `shadow-soft` token; nothing to do.

## PR note

- **Summary** — Removes the duplicate local shadcn component set so the attached ICF design system is the single component source.
- **Changes** — UI: import swaps in seven components; deletion of `src/components/ui/`; alias update in `components.json`.
- **Backend / schema changes** — None.
- **Testing & verification** — Typecheck, build, plus manual passes over the assistant widget, markdown toolbar, Unsplash picker, LinkedIn share card, staff registration dialog and event editor confirm dialog.
- **Risks & rollback** — Blast radius is presentation only; a subtle prop mismatch between the two copies would show as a visual or interaction regression in one of the six dialogs. Rollback is restoring the deleted directory and reverting the import lines.
- **Follow-ups / known debt** — A light-on-dark button variant belongs in the design-system library project; until it exists, the Deep Blue CTAs stay hand-styled.
