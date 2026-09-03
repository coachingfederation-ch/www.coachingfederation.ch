# Friendlier article scheduling

## What's wrong today

"Schedule…" in the article editor calls the browser's native `window.prompt`. That is why:

- **Preview**: the preview iframe blocks native prompts, so nothing happens at all.
- **Production**: you get the browser's bare grey overlay asking for a free-text
  `YYYY-MM-DD HH:MM` string.
- There is also a real timezone bug: the suggested default is generated in UTC but the
  value you type is parsed as Zurich local time, so accepting the default schedules the
  article two hours earlier than it reads.

## What we build instead

A proper scheduling dialog, opened from the same "Schedule…" button, built from the
design system (`Dialog`, `Calendar`, `Select`, `Button`, `Badge`).

```text
┌ Schedule publication ─────────────────────────┐
│  September 2026        [ calendar grid ]      │
│                                               │
│  Time   [ 09:00 ▾ ]   (15-minute steps)       │
│                                               │
│  Quick:  Tomorrow 09:00 · Monday 09:00 ·      │
│          In one hour                          │
│                                               │
│  “Goes live Monday, September 7, 2026 at      │
│   9 a.m. (Zurich) — in 3 days.”               │
│                                               │
│            [ Cancel ]  [ Schedule article ]   │
└───────────────────────────────────────────────┘
```

Behaviour:

- Past dates and past times today are disabled; the confirm button stays disabled until a
  valid future moment is picked, so an invalid-date toast is no longer needed.
- One plain-language confirmation line states the exact moment **and names the time zone**
  (chapter voice: `Monday, September 7, 2026`, `9 a.m. (Zurich)`), plus a relative hint.
- If the article is already scheduled, the dialog opens on the existing date/time and the
  confirm button reads "Update schedule".
- Converting to UTC happens once, at confirm, from the picked local date+time — fixing the
  timezone bug.
- The sidebar's scheduled line keeps working unchanged; it already renders `scheduled_at`.

No change to the publish state machine, permissions, or the server function — the same
`schedule` transition with an ISO timestamp is sent.

## Technical notes

- New component `src/components/cms/ScheduleDialog.tsx`, used from
  `src/routes/_staff/articles.$id.tsx`; the `schedule()` helper drops `window.prompt` and
  just opens the dialog, then calls the existing `runTransition`.
- Time options generated in 15-minute steps; date+time combined via local `Date` parts.
- Strings under `editor.*` in `src/i18n/locales/{en,de,fr,it}/cms.json`:
  new keys for dialog title, time label, quick presets, confirmation sentence, confirm and
  update labels. `editor.schedulePrompt` and `editor.invalidDate` are removed in all four
  languages.
- Styling uses design-system components and tokens only.

## PR note

**Summary** — Replaces the native `window.prompt` article scheduler with a design-system
dialog offering a calendar, a time picker and quick presets, and fixes a UTC/local
mismatch that shifted the suggested schedule time.

**Changes**
- UI: new `ScheduleDialog`; `articles.$id.tsx` opens it instead of prompting.
- i18n: new `editor.schedule*` keys in EN/DE/FR/IT; two obsolete keys removed.

**Backend / schema changes** — None.

**Testing & verification** — Typecheck, Prettier, build; Playwright run in the staff editor
as a publisher on a `review` article: dialog opens in preview (no native prompt), past
times disabled, confirmation sentence matches the picked moment, article moves to
`scheduled` with the expected `scheduled_at`. Mobile viewport checked.

**Risks & rollback** — Confined to one staff screen; revert the component and the call site.

**Follow-ups** — Unscheduling still goes through the existing "Unpublish" action; no
in-dialog "remove schedule" shortcut is added.
