# Europe Pulse as a view inside Events (Option 1)

## What visitors will see

A compact two-option switch on the Events page, right below the page header and above the filters:

```text
[ Switzerland ]  [ Across Europe ]
```

- **Switzerland** (default): the Events page exactly as today: Upcoming/Past, region, community, category, format, featured event, calendar subscribe.
- **Across Europe**: the Swiss filters and featured card are replaced by the Europe Pulse content: week label and item count, past-edition navigation, archive note, the curated European cards (flag, chapter, type, link to chapter site), and the disclaimer.
- The address becomes `/events?view=europe` (and `?view=europe&week=YYYY-MM-DD` for past editions), so it can be bookmarked, shared, and the back button works. Same on `/de/events`, `/fr/events`, `/it/events`.
- If Europe Pulse is switched off in Integration, the switch is hidden and `?view=europe` simply shows the Swiss view.
- The old `/europe-pulse` addresses (all four languages) redirect permanently to the new view, keeping any `week`.
- The "See Europe Pulse" teaser on the Insights page points to the new view.

The hero stays the Events hero in both views; the Europe view gets a short intro line (existing Europe Pulse lede) above the cards so context is not lost.

## Steps

1. Extend the events address rules with `view` (`"europe"` or empty) and `week`; unknown values fall back to the Swiss view.
2. Split the Europe Pulse page body into a reusable "Europe Pulse feed" section (no hero, no footer). Edition navigation links switch to `/events?view=europe&week=…`.
3. Add the switch to the Events page using the design system toggle group, labelled for screen readers, keyboard reachable. Switching clears Swiss-only filters when leaving Switzerland and clears `week` when returning.
4. Render either the Swiss content or the Europe feed below the switch; Europe data loads only when that view is opened.
5. Turn `/europe-pulse` and `/$locale/europe-pulse` into permanent redirects; update the Insights teaser link; check the sitemap and assistant knowledge for the old address.
6. Add switch labels in EN, DE, FR, IT ("Switzerland" / "Across Europe").
7. Update docs (Europe Pulse, events) and the code map.

## Technical details

- `src/lib/events-search.ts`: add `view` and `week` as optional strings (same `.catch` style as existing facets); validate in component.
- New `src/components/europe-pulse/EuropePulseFeed.tsx` extracted from `src/pages/EuropePulse.tsx` (PulseCard, EditionNav, states). `src/pages/EuropePulse.tsx` is removed once redirects are in place.
- `src/pages/Events.tsx`: read `view`, gate on `featureFlagsQueryOptions.europe_pulse`; feed uses existing `listEuropePulse` with `useQuery` keyed on locale + week (unchanged server function).
- Redirect routes: `beforeLoad` throwing `redirect({ to: "/events" | "/$locale/events", search: { view: "europe", week }, statusCode: 301 })`.
- Staff CMS (`/manage/europe-pulse`), scan cron and data model are untouched.
- Head metadata of the Events routes stays as is.

## PR note

**Summary.** Moves the public Europe Pulse feed into the Events page as a second view behind a Switzerland / Across Europe switch, so Swiss and European activity share one destination without mixing.

**Changes.**
- UI: view switch on Events; Europe feed extracted into a reusable section; Insights teaser link updated.
- Routing: `view`/`week` on Events; old Europe Pulse addresses redirect (301).
- i18n: two new labels in four languages.
- Docs: `docs/europe-pulse.md`, `docs/events-team-communities.md`, `docs/code-map.md`.

**Backend / Schema Changes.** None.

**Testing & Verification.** Browser check: default Swiss view unchanged; switch to Europe and back; past edition navigation; old address redirects in EN and one other language; feature flag off hides the switch; keyboard focus on the switch; mobile width.

**Risks & Rollback.** Limited to public Events and Europe Pulse pages. Revert by restoring the old page and routes; no data impact.

**Follow-ups / Known Debt.** Type filter (webinar, workshop, news) inside the Europe view is not included; can be added later.
