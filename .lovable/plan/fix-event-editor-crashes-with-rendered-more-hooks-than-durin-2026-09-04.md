# Fix: event editor crashes with "Rendered more hooks than during the previous render"

## What is actually happening

This is not a database migration problem. The runtime error captured from the preview is:

```text
Error: Rendered more hooks than during the previous render.
  at useRef -> use-save-shortcut -> manage.events._id
```

The staff event editor (`src/routes/_staff/manage.events.$id.tsx`) returns early
with a loading/error placeholder while the event is still being fetched:

```text
line 152   if (!event) return <Shell>…loading…</Shell>
line 296   useSaveShortcut(save, saving || !dirty)   <-- hook after the early return
```

On the first render (event still null) React sees N hooks. Once the event
arrives the component runs past the early return and calls one more hook, which
violates the Rules of Hooks and blows up into the root error boundary — the
"This page didn't load" screen you selected.

The Cmd/Ctrl+S save shortcut added recently is what introduced the extra hook;
the other editors (articles, newsletters, community panel) call it before their
early returns and are unaffected.

## The fix

In `src/routes/_staff/manage.events.$id.tsx`:

1. Move the `save` handler and the `dirty` computation above the `if (!event)`
   early return, guarding `save` with an `if (!event) return;` at the top so the
   body is unchanged otherwise.
2. Compute `dirty` as `event !== null && baseline !== null && baseline !== JSON.stringify(event)`.
3. Call `useSaveShortcut(save, saving || !dirty)` above the early return, so the
   hook count is identical on every render.
4. Remove the now-duplicated declarations further down the component; everything
   below keeps referencing the same `save` and `dirty` names, so no call sites
   change.

No backend, schema, RLS or data changes. No behaviour change beyond the page no
longer crashing: the shortcut stays disabled while nothing is dirty or a save is
in flight.

## Verification

- Load `/manage/events/<id>` in the preview and confirm the editor renders
  instead of the error boundary, with no console errors.
- Edit a field, press Cmd/Ctrl+S, confirm it saves once and the browser Save
  dialog is suppressed.
- Confirm the loading state (before the event resolves) still shows the
  placeholder and no longer transitions into an error.
- Typecheck, Prettier, build.

## PR note

**Summary** — The staff event editor crashed after the Cmd/Ctrl+S shortcut was
added, because the hook sat below an early return. Hoisting it fixes the crash.

**Changes**
- UI: reorder `save`, `dirty` and `useSaveShortcut` in
  `src/routes/_staff/manage.events.$id.tsx` so all hooks run unconditionally.

**Backend / Schema Changes** — None.

**Testing & Verification** — Manual load of the event editor as a staff user,
save via keyboard and via the Save button, loading state, plus typecheck /
Prettier / build.

**Risks & Rollback** — Confined to one route file; revert the single file to
roll back. No migration involved.

**Follow-ups / Known Debt** — Consider a lint rule run (`react-hooks/rules-of-hooks`)
in CI so a hook below an early return is caught before it reaches preview.
