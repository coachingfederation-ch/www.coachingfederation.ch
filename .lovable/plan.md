# Show progress while publishing

When you press **Publish** (or Unpublish / Cancel event), the button you pressed immediately changes to a working state until the system is done, including sending queued invitations.

## What you will see

- The pressed button shows a small spinning icon and reads **"Publishing…"** (or "Unpublishing…" / "Cancelling…").
- All three buttons are disabled while it works, so a second click cannot send invitations twice.
- When finished, the button returns to normal and the status label updates as today. If something fails, the existing error message appears and the buttons become usable again.

## Technical details

- `EventLifecycleActions` in `src/components/cms/EventEditorSections.tsx`: local `pending` state holding the target status; `run(status)` sets it, awaits `changeStatus`, clears it in `finally`.
- Buttons get `disabled={pending !== null}` and `aria-busy`; the pressed one renders the design-system `Spinner` plus the in-progress label. Existing button classes stay unchanged.
- New i18n keys `events.publishing`, `events.unpublishing`, `events.cancelling` in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- Confirm the `changeStatus` caller in `manage.events.$id.tsx` returns its promise (so the spinner lasts through the email sending); adjust if it does not.

## PR note

**Summary** — Publishing can take a few seconds now that invitations are sent; the lifecycle buttons show a spinner and "Publishing…" and block double clicks.

**Changes** — UI: busy state on Publish / Unpublish / Cancel. i18n: three labels in four languages.

**Backend / Schema Changes** — None.

**Testing & Verification** — Publish a draft with queued invitations in the preview; confirm spinner, disabled buttons, and normal state afterwards.

**Risks & Rollback** — UI-only; revert the component change.

**Follow-ups** — None.
