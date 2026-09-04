# Coach Finder: an honest "not active" state with a demo profile

Today, unchecking all three Coach Finder modes (Coaching, Mentoring, Supervision) changes almost nothing for visitors: the mode tabs disappear, but the search panel and results grid still render and still list real coaches. This makes the setting look broken.

## What changes for visitors

When all three modes are switched off in the CMS, `/find-a-coach` no longer shows filters or results. Instead it shows a calm information panel:

- A short heading and paragraph explaining that the coach directory is not open yet, and inviting people to come back or contact the chapter.
- One primary action: "View a demo profile", linking to a sample coach page.
- The existing hero and the "how coaching works" context section above it stay in place, so the page never looks empty.

The demo coach page is a complete, realistic profile using an obvious placeholder person (Anna Muster, ACC), clearly marked as a demonstration example with a banner at the top so nobody mistakes it for a real coach. It lives at `/coach/demo`, is written in code (no database rows), and never appears in real search results.

If at least one mode is enabled, everything behaves exactly as it does now.

## What changes for staff

On the Coach Finder settings page, when all three mode checkboxes are off, an inline note appears under the modes section stating that the public Coach Finder is currently hidden and visitors see the information page with the demo profile.

## Technical notes

- `activeFinderModes()` already returns `[]` when everything is off. Add a derived `finderDisabled` flag (config loaded and no active modes) in `useCoachDirectoryFilters`, expose it, and have `CoachDirectory` return the new `CoachFinderInactive` panel early instead of tabs/filters/results. Keep the query disabled in that state so no directory request is issued.
- New component `src/components/coaches/CoachFinderInactive.tsx`, built from existing design-system pieces (`Button variant="pill"`, card surface tokens) — no new styling values.
- New fixture `src/lib/demo-coach.ts` exporting a `PublicCoachProfile`-shaped object with `profile_id: "demo"`, using vocabulary slugs that already exist so chips label correctly.
- Route `/coach/$profileId` gets a short-circuit: `profileId === "demo"` renders `CoachProfilePage` with the fixture plus a demo banner, and skips the loader fetch, `useTrackView` analytics attribution stays but is tagged as demo. Same for the locale-prefixed coach route if present.
- Copy added to `src/i18n/locales/{en,de,fr,it}/directory.json` under `directory.inactive.*` and `directory.demo.*`; the demo profile's own prose lives in the fixture keyed per locale.
- CMS note added to `src/routes/_staff/coach-finder.tsx` with a string in the CMS locale file.
- No database, RLS or grant changes.

## PR note

**Summary** — Make the Coach Finder mode switches actually take effect publicly: with all modes off, the directory is replaced by an explanatory panel and a link to a hard-coded demo coach profile.

**Changes**
- UI: `CoachFinderInactive` panel; early return in `CoachDirectory`; demo banner on the coach profile page; staff hint on the settings page.
- Data: hard-coded demo profile fixture; `/coach/demo` short-circuit in the route loader.
- Copy: new `directory.inactive.*` / `directory.demo.*` keys in all four languages, plus one CMS string.

**Backend / schema changes** — None.

**Testing & verification** — Toggle all three modes off and confirm `/find-a-coach` shows the notice and issues no directory query; toggle one back on and confirm normal behaviour returns; open `/coach/demo` directly and via the panel; confirm the demo profile never appears in search results; check DE/FR/IT/EN copy, mobile layout, and keyboard focus on the CTA.

**Risks & rollback** — Low blast radius: additive components plus one early return. Reverting the commit restores current behaviour; no migrations involved.

**Follow-ups / known debt** — The notice text is fixed translated copy; making it CMS-editable would need a multilingual field on `coach_finder_config`. Per-mode (rather than all-off) notices are out of scope.
