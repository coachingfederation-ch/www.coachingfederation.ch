# Auto-translate project and role labels

Today, when an admin adds a project, a local community, or a role in the operational structure, only the English label is stored. The German, French and Italian fields stay empty until someone types them by hand.

## What changes

- Creating a new project, community, or role auto-translates the English label into DE, FR and IT and saves those labels with the new row.
- The translated labels stay fully editable afterwards — the existing DE/FR/IT inputs keep working, and a manual edit is never overwritten.
- Existing rows get a small "Translate labels" action so empty language fields can be filled on demand (only fields that are still empty are filled, unless the admin re-runs it explicitly).
- If translation fails or is slow, the row is still created with its English label and an inline notice explains that translations were not filled — creation never blocks on the AI call.

## Technical notes

- New server function `translateOpsLabels` in `src/lib/ops-label-translations.functions.ts`, modelled on the existing `translateTierNames`: one batched Lovable AI call (`google/gemini-3-flash-preview`), JSON-only response, short-label prompt (sentence case, no trailing punctuation, keep ICF/ACC/PCC/MCC and Swiss place names untranslated). Gated with `requireSupabaseAuth` + `assertPlatformAdmin`, the same boundary as the rest of this screen.
- The function returns translations only; the caller writes them, so RLS on `op_projects` / `op_project_roles` remains the real boundary.
- `addProject` and `addRole` in `src/routes/_staff/operational-structure.tsx` insert the row, then call the function and patch `name_de` / `name_fr` / `name_it` on the new row.
- The "Translate labels" action is wired into `ProjectForm.tsx` (project) and `RoleAssignmentEditor.tsx` (per role) using existing design-system `Button` primitives.
- New CMS strings (`ops.translateLabels`, `ops.translating`, `ops.translateFailed`) added in DE/FR/IT/EN.
- No schema change: `name_de` / `name_fr` / `name_it` already exist on both tables.

## PR note

- **Summary** — Auto-translate operational-structure labels into DE/FR/IT on creation, with editable results and an on-demand translate action.
- **Changes** — UI: translate action in project form and role editor; Backend: new `translateOpsLabels` server function; i18n: four new CMS strings per locale.
- **Backend / schema changes** — None.
- **Testing & verification** — Create a project, a community and a role as Super Admin and confirm all three languages fill in; edit a translated label and confirm it persists; simulate an AI failure and confirm the row is still created.
- **Risks & rollback** — Low: additive. Rollback by removing the calls; existing rows are unaffected. Each creation now costs one AI call.
- **Follow-ups** — Optional bulk backfill for existing rows with missing labels.
