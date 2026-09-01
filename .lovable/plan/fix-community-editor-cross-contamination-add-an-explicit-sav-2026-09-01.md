# Fix community editor cross-contamination, add an explicit save state

## What is actually wrong

Confirmed by reading the code, not guessed:

1. **The panel is never remounted when you switch communities.** In
   `src/routes/_staff` the operational-structure page renders `ProjectForm` (and
   inside it `CommunityPanel`) without a `key`, so React reuses the same
   component instance for Zurich and Berne. All local state survives the switch.
2. **A stale draft ref writes one community's text onto another.**
   `CommunityPanel` keeps `draft = useRef<Record<string, string>>({})` holding the
   last keystrokes of the Markdown fields. It is never cleared when the selected
   project changes. The description wrapper's `onBlur` compares
   `draft.current.description` with the *new* row and, when they differ, saves it.
   So: edit Zurich's description, switch to Berne, click anywhere inside Berne's
   description block and blur → Zurich's text is written into Berne. That is the
   "overwritten" symptom. The same ref is shared by the DE/FR/IT translation
   fields.
3. **Refetch clobbers un-blurred edits.** Every `save()` calls `onSaved()` →
   `loadProjects()` → a new `projects` array → a new `project` object →
   `useEffect(() => setRow(project), [project])` resets the whole local row.
   Anything typed but not yet blurred in another field is discarded. That is the
   "text not changing" symptom.
4. **No save state at all.** Every field autosaves on blur; there is no dirty
   indicator, no save button, no error surface tied to a specific action, so
   there is no way for an editor to tell whether their text landed.

## What changes

### A. Stop the cross-contamination (the actual bug)

- Give `CommunityPanel` a `key={project.id}` where it is rendered in
  `ProjectForm`, so switching community fully resets its state. Same for the
  region list and the image brief, which today also carry over.
- Remove the shared `draft` ref entirely. With an explicit save (below) the
  Markdown value lives in `row` like every other field and there is no
  blur-time comparison against stale text.

### B. Explicit save state with a Save CTA

`CommunityPanel` moves from "autosave on every blur" to one edit buffer plus an
explicit save:

- All fields (`is_featured_community`, cadence, contact, sign-up URL, image alt
  and URL, description, translation fields) write into local `row` state only.
- A `dirty` flag is derived by comparing `row` with the last known server row.
- A sticky footer bar inside the panel shows the state and the action:
  - unchanged → muted "All changes saved"
  - dirty → "Unsaved changes" plus a primary **Save** button and a **Discard**
    button that restores the server row
  - saving → button disabled with a spinner
  - error → the message next to the button, edits kept in the buffer
- `Cmd/Ctrl+S` inside the panel triggers the same save.
- **Refetch no longer clobbers.** `setRow(project)` only runs when
  `project.id` changes, or after a save the panel itself performed — never
  because an unrelated `loadProjects()` produced a new object.
- **Switch guard.** When the panel is dirty and the user selects another
  community, a confirm dialog offers Save, Discard, or Cancel. Implemented by
  lifting a small "dirty" signal to the operational-structure page so the
  sidebar's select handler can intercept it.

Actions that are inherently immediate keep saving right away, because they
already produce a server-side artefact: image upload, AI image generation,
Unsplash pick, image remove, language checkboxes, region checkboxes, and AI
translation. Each of them also refreshes the buffer so the Save button does not
then report phantom changes.

### C. Copy

Four new CMS strings (EN/DE/FR/IT): `ops.community.saved`,
`ops.community.unsaved`, `ops.community.save`, `ops.community.discard`, plus a
confirm-dialog line `ops.community.leaveDirty`.

## Technical detail

- `src/components/cms/CommunityPanel.tsx` — remove `draft` ref; add `saved`
  (the server baseline) and `saving` state; `save()` becomes an explicit
  `saveAll()` that diffs `row` against `saved` and sends only changed columns;
  keep `savePatch()` for the immediate-action group; `useEffect` keyed on
  `project.id` instead of the whole `project` object.
- `src/components/cms/ops/ProjectForm.tsx` — `key={project.id}` on
  `CommunityPanel`, and pass an `onDirtyChange` callback through.
- `src/routes/_staff/<operational-structure route>` — hold `communityDirty` and
  wrap the sidebar's `setSelected` in the confirm guard.
- `src/i18n/cms.tsx` (or the CMS string file it reads) — the five new keys in
  all four locales.

No schema, RLS, or server-function changes. The public `/communities` pages are
untouched.

## PR note

**Summary** — Fixes community CMS entries overwriting each other's description
when switching between communities, and replaces the invisible blur-autosave
with an explicit save state and Save CTA.

**Changes**
- UI: `CommunityPanel` gains a dirty/saving/saved footer with Save and Discard,
  and a Cmd/Ctrl+S shortcut.
- UI: `CommunityPanel` is remounted per project (`key`), so no state leaks
  between communities.
- Bug fix: removed the shared Markdown `draft` ref that wrote the previously
  selected community's text into the newly selected one.
- Bug fix: server refetches no longer reset the edit buffer mid-typing.
- UX: unsaved-changes confirm when switching community in the sidebar.
- i18n: five new CMS strings in EN/DE/FR/IT.

**Backend / Schema Changes** — None.

**Testing & Verification** — Open the operational structure CMS as an admin.
Edit Zurich's description, switch to Berne without saving → confirm prompt;
discard, then verify Berne still shows its own text and that clicking in and
out of Berne's description writes nothing. Save on Zurich, reload, confirm the
text persisted. Verify image upload, Unsplash, AI generation, language and
region checkboxes still apply immediately and leave the panel clean. Verify the
AI translation buttons still fill DE/FR/IT and that those fields then save
through the same CTA.

**Risks & Rollback** — Medium-low, confined to one CMS panel plus a `key` and a
guard in its two parents. No data migration; revert the three files and the
locale keys.

**Follow-ups / Known Debt** — The rest of the operational-structure form (names,
locale labels, active toggle) still autosaves on blur; unifying it under the same
save model is a separate change.
