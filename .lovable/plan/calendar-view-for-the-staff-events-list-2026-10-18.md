# Calendar view for the staff events list

Add a "List | Calendar" switch above the events table at `/manage/events`. The calendar is another way to see the same filtered events, not a separate page.

## What you get

- **Month grid** (Mon–Sun, Swiss week) with previous / next month and a "Today" button. Days with events are highlighted; today has a subtle ring.
- **In each day cell** (desktop): up to three compact event chips showing time, title (shortened), and a small category colour dot plus "Online" or the city. "+2 more" when there are more.
- **Click a day** to open a side panel listing that day's events with time, title, category, community, location, and status — each linking to the event editor.
- **Small screens**: the grid shows only dots per day; tapping a day opens the same list below the grid.
- **Filters still apply**: search, category, community, host, created by, city, credits and status filter the calendar exactly as they filter the list. Pagination is hidden in calendar view.
- **Shareable**: the chosen view and month are kept in the address, so a bookmarked link reopens the same month in calendar view.
- When the status filter is at its default (hiding passed events), past days look empty; a short hint under the grid says passed events are hidden and offers to show them.

## Technical notes

- Search schema in `src/routes/_staff/manage.events.index.tsx` gains `view: "list" | "calendar"` (default list) and `month: "YYYY-MM"` (default current month), both with `fallback()`; excluded from the "pristine" check so the saved-filter restore keeps working.
- New presentational component `src/components/cms/EventsCalendar.tsx` receives the already-filtered rows; groups by day in Europe/Zurich using the event timezone (reuse `formatEventTime` from `src/lib/events.ts`). Multi-day events appear on each day they span.
- Grid is built with CSS grid and design tokens (`bg-card`, `border-border`, `bg-highlight` for event days, `ring-ring` for today); category dots use chart tokens. The design-system `Calendar` (day picker) is too small for chips, so it is not used; the toggle uses the design-system `ToggleGroup`, the day panel uses `Sheet`.
- No server or database changes — uses the rows `listManagedEvents` already returns.
- New i18n keys under `events.calendar.*` in `src/i18n/locales/{en,de,fr,it}/cms.json`; weekday/month names via `Intl`.
- Docs: short section in `docs/events-team-communities.md` and an entry in `docs/code-map.md`.

## PR note

**Summary** — Adds a month calendar as an alternative to the staff events list, highlighting event days with time, category and location, driven by the existing filters.

**Changes**
- UI: List/Calendar toggle, `EventsCalendar` component, day detail panel.
- Routing: `view` and `month` search params.
- i18n/docs: new keys in four locales, docs updated.

**Backend / Schema Changes** — None.

**Testing & Verification** — Toggle both views; month navigation and Today; filters applied in calendar; multi-day and online/hybrid events; day panel links; mobile width; reload restores view and month; all four locales.

**Risks & Rollback** — Contained to one route and one new component; reverting restores the list-only page. No data risk.

**Follow-ups / Known Debt** — Week view and drag-to-reschedule are out of scope.
