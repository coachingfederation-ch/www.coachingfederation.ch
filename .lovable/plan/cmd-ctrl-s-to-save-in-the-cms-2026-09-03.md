# Cmd/Ctrl+S to save in the CMS

Today only the community editor listens for Cmd/Ctrl+S; every other CMS editor
requires clicking Save (or waiting for autosave). This makes the shortcut a
consistent, shared behaviour across the staff editors, and stops the browser's
"Save page" dialog from appearing.

## Behaviour

- Cmd+S (macOS) / Ctrl+S (Windows, Linux) saves the page being edited.
- The browser's own save dialog is always suppressed on CMS pages, even when
  there is nothing to save, so the shortcut never surprises an editor.
- Works while typing in a text field — no need to blur first.
- Nothing happens when a save is already running, or when nothing changed.
- On the article editor, which autosaves on a timer, the shortcut flushes the
  pending autosave immediately instead of waiting out the delay.
- No visual change: existing save-state labels ("Saving…", "Saved") and
  error messages report the result as they do today.

## Scope

Applied to the staff editors that own an explicit save:

- Article editor
- Event editor
- Newsletter editor (title/meta)
- Community panel (replaces its one-off listener)

Read-only or list pages are untouched.

## Technical notes

- New hook `src/hooks/use-save-shortcut.ts`: registers a `keydown` listener on
  `window`, matches `(metaKey || ctrlKey) && key === "s"`, calls
  `event.preventDefault()` unconditionally, then invokes the passed handler
  unless a `disabled` flag is set. Handler is held in a ref so callers don't
  need to memoise. Cleanup on unmount.
- `CommunityPanel.tsx`: delete the inline `useEffect` and call the hook with
  `saveAll`.
- `manage.events.$id.tsx`: call the hook with `save`, disabled while
  `saving` or when `!dirty`.
- `manage.newsletters.$id.tsx`: call the hook with the existing meta-save
  mutation for the title field.
- `articles.$id.tsx`: extract the autosave body into a `flushSave()` callback
  used by both the debounce timer and the hook; the shortcut clears the pending
  timer and awaits `flushSave()` directly.

## PR note

**Summary** — Adds a shared Cmd/Ctrl+S save shortcut to the staff CMS editors
and suppresses the browser's native save dialog on those pages.

**Changes**
- UI: new `use-save-shortcut` hook; wired into article, event, newsletter and
  community editors; inline listener in `CommunityPanel` removed.
- Backend/schema: none.

**Backend / Schema Changes** — None.

**Testing & Verification** — Manual check per editor: Cmd/Ctrl+S while focused
in a text field saves and shows the existing save state; the browser dialog
never appears; repeated presses during an in-flight save do not double-submit;
pressing with no changes is a no-op. Typecheck, build and Prettier.

**Risks & Rollback** — Low; presentation-only. Revert the hook and the four
call sites. Main risk is intercepting Cmd+S where a user expected the browser
dialog, which is the intended trade-off on CMS routes only.

**Follow-ups / Known Debt** — Other staff screens (roles, members, coach
finder, integration) keep click-only saving; can adopt the same hook later.
