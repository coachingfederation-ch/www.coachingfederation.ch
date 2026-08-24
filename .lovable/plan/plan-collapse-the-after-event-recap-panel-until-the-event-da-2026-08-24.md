# Plan: Collapse the "After event recap" panel until the event date has passed

## Goal
The "After event recap" panel in the event editor should be **collapsed** (title-only) while the event is still in the future, so editors aren't distracted by post-event work too early. The panel stays visible so staff know it exists, with an **Expand** affordance to open it manually if needed. Once the event date has passed, the panel renders fully expanded as it does today.

## Current state
- `EventRecapEditor` (`src/components/cms/EventRecapEditor.tsx`) always renders the full panel via the shared `Section` component.
- It receives only `eventId` and `t` — it does **not** know the event's start date.
- The route `src/routes/_staff/manage.events.$id.tsx` already has `event.starts_at` available (line 165/370/404) and renders `<EventRecapEditor eventId={event.id} t={...} />` at line 443.

## Changes

### 1. Pass the event start date into the recap editor
**File:** `src/routes/_staff/manage.events.$id.tsx` (line 443)
- Add `eventStartsAt={event.starts_at}` to the `<EventRecapEditor>` props.

### 2. Add collapse/expand behaviour inside `EventRecapEditor`
**File:** `src/components/cms/EventRecapEditor.tsx`
- Add prop `eventStartsAt: string`.
- Compute `const eventPassed = new Date(eventStartsAt).getTime() < Date.now()`.
- Add local state `const [expanded, setExpanded] = useState(eventPassed)`.
- **Collapsed state** (`!expanded`): render `<Section title={t("recap.title")} hint={t("recap.collapsedHint")}>` containing only a short note (`t("recap.collapsedNote")`) and a button **Expand** (`t("recap.expand")`) that calls `setExpanded(true)`. Skip the data load entirely in this state (no `getManagedRecap` call) so we don't fetch post-event data prematurely.
- **Expanded state** (`expanded`): render the full editor exactly as today (existing load + all sub-panels).
- The existing `useEffect` load should be gated on `expanded` so it only runs once the panel is opened.

### 3. i18n strings
Add three new keys under `events.recap` in all four locale files (`src/i18n/locales/{en,de,fr,it}/cms.json`):

| key | en | de | fr | it |
|---|---|---|---|---|
| `recap.collapsedHint` | Available after the event date. | Verfügbar nach dem Anlassdatum. | Disponible après la date de l'événement. | Disponibile dopo la data dell'evento. |
| `recap.collapsedNote` | This section unlocks once the event date has passed. You can expand it early if you need to. | Dieser Bereich wird nach dem Anlassdatum freigeschaltet. Sie können ihn vorzeitig öffnen, falls nötig. | Cette section se déverrouille après la date de l'événement. Vous pouvez l'ouvrir en avance si nécessaire. | Questa sezione si sblocca dopo la data dell'evento. Puoi aprirla in anticipo se necessario. |
| `recap.expand` | Expand | Ausklappen | Déplier | Espandi |

## Notes
- No database or schema changes.
- No changes to the public recap page (`EventRecap.tsx`) — this only affects the staff editor.
- The `Section` component itself is left untouched (other sections unaffected); collapse logic lives inside `EventRecapEditor`.

## PR note
- **Summary:** Collapses the "After event recap" editor panel to a title-only state until the event's start date has passed, with a manual Expand button; auto-expands once the date is in the past.
- **Changes (UI):** `EventRecapEditor` gains an `eventStartsAt` prop and a collapsed/expanded state; route passes `event.starts_at`. Three new i18n keys per locale.
- **Backend / Schema:** None.
- **Testing & Verification:** Open a future event in the editor → recap panel shows title + hint + Expand only, no data load. Click Expand → full panel loads. Open a past event → full panel renders immediately. Check all four locales render the new strings.
- **Risks & Rollback:** Low blast radius — only the recap editor panel. Revert by removing the prop and the collapsed branch.
- **Follow-ups:** None.
