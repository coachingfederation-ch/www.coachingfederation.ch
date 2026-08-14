# One "Where" filter covering regions and communities

The second dropdown on `/events` currently lists only regions. It becomes a single
combined filter that lets a visitor narrow by region *or* by local community.

## What visitors see

- The dropdown keeps its place and its "All regions" default, relabelled to cover both
  (EN: "Region or community"; translated in DE/FR/IT).
- It is grouped into two labelled sections:
  - **Regions** — the existing `cf_regions` vocabulary (Nationwide, Zürich, … Online only).
  - **Communities** — the local communities that actually have events in the current
    list (e.g. Community Zürich, Community Geneva), sorted alphabetically.
- Picking a region filters on the event's region; picking a community filters on the
  event's community. Only one of the two applies at a time — choosing a community
  clears any region selection and vice versa, which keeps the control honest.
- The choice stays shareable in the URL: regions keep `?region=zurich`, communities use
  a new `?community=community-zurich`. Existing links with `?region=` keep working.
- "Reset filters" and the empty state behave exactly as today.

## Technical notes

- `events_public` already exposes `community_id`, `community_slug` and `community_name`,
  and `PUBLIC_EVENT_COLUMNS` already selects them — no schema or view change, no
  migration.
- `src/lib/events-search.ts`: add an optional `community` string facet (same
  `.optional().catch(undefined)` shape as the others).
- `src/pages/Events.tsx`:
  - Build community options from the loaded `upcoming`/`past`/`featured` rows by
    de-duplicating `community_slug` + `community_name`; this avoids a second round trip
    and never shows a community with nothing to show.
  - Replace the region `FilterSelect` with a grouped select (native `<optgroup>`,
    same `selectClass` styling) whose value is `region:<slug>` or `community:<slug>`.
  - `matches()` gains `(!community || e.community_slug === community)`.
  - `hasFacetFilters` includes `community`.
  - Selecting an option writes one facet and clears the other in the same navigate call.
- i18n: new keys `events.filter.where` (label) and `events.filter.anyWhere`,
  `events.filter.groupRegions`, `events.filter.groupCommunities` in
  `src/i18n/locales/{en,de,fr,it}/events.json`. The old region label key stays until
  nothing references it, then is removed.
- No staff/CMS change: the event editor already stores both region and community.

## PR note

**Summary** — Merges the events page region filter and community affiliation into one
grouped "Region or community" dropdown, so visitors can browse a local community's
events directly from `/events`.

**Changes**
- UI: grouped select with Regions / Communities optgroups; combined filter state and
  reset behaviour in `src/pages/Events.tsx`.
- Search params: new optional `community` facet in `src/lib/events-search.ts`.
- i18n: new filter labels in four locales.

**Backend / schema changes** — None. The public view and column list already carry the
community fields.

**Testing & verification** — Region-only, community-only, combination with category /
language / format, deep-linked `?region=` and `?community=` URLs, upcoming vs past,
empty state and reset, all four locales, anonymous visitor.

**Risks & rollback** — Low and frontend-only; reverting the two files restores the old
behaviour. Old `?region=` links remain valid.

**Follow-ups / known debt** — Community names are not translated (they come from
`op_projects.name`); if that becomes a requirement it needs a translation column, not a
frontend change.
