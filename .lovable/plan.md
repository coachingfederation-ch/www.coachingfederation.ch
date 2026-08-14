# Region on community events, prefilled from the community

## What's happening today

In the event editor, Category and Region/Community are mutually exclusive: choosing
"Community events" swaps the Region selector for a Community selector and clears
`region_id`. The public `/events` filter bar still offers a Region facet, so
community events silently drop out of every region filter.

## What changes

- The **Region** field is always visible in "Event details", next to Category.
  For community events it appears in addition to the Community selector, not
  instead of it. Selecting a category no longer clears `region_id`.
- When a Community is picked and Region is still empty, the editor **prefills
  Region from that community's own region** — the link already exists in the
  database (`op_project_regions`), e.g. Community Zürich -> Zurich,
  Community Swizzera Italiana -> Ticino. Communities mapped to several regions
  (Geneva, Lausanne) use the first by sort order.
- The prefill is only a suggestion: it fires when Region is empty, and staff can
  override it or set "Nationwide" for events that apply everywhere. Changing the
  community again re-suggests only if Region was left empty.
- A short hint under Region explains it drives the public filter and that
  Nationwide means "applies everywhere".

Nothing on the public side needs new logic — community events simply start
carrying a region, so they show up under both the Region and the Community
facets.

## Technical notes

- `listCommunityOptions` (`src/lib/events-admin.functions.ts`) additionally
  selects the community's regions via `op_project_regions -> cf_regions`,
  returning `{ id, name, regionIds: string[] }` ordered by `cf_regions.sort_order`.
- `EventDetailsSection` (`src/components/cms/EventEditorSections.tsx`):
  remove the `isCommunity` either/or branch, render Community (community
  category only) and Region (always); on community change, when
  `event.region_id` is null, patch `region_id` with the community's first region.
- New i18n key `events.fieldRegionHint` in `cms.json` for EN/DE/FR/IT.
- No schema change. Existing community events keep `region_id = null` until an
  editor saves them; optionally a one-off data update can backfill them from
  `op_project_regions` — say the word and it goes in as a separate data step.

## PR note

**Summary** — Community events can now also carry a Region, prefilled from the
community's mapped region, so they are reachable through the public region filter.

**Changes**
- UI: Region always shown in the event details section; community selection
  suggests a region; hint text added.
- Backend: `listCommunityOptions` returns each community's region ids.
- i18n: one new key in all four locales.

**Backend / schema changes** — None. (Optional separate backfill of existing
community events' `region_id`.)

**Testing & verification** — Community event: pick a community, region prefills,
override sticks, save round-trips; non-community event unaffected; `/events`
region filter now matches community events; all four CMS locales render labels.

**Risks & rollback** — Low, editor-local. Reverting the code leaves any regions
already saved in place, which is harmless.

**Follow-ups / known debt** — Multi-region communities pick the first region only;
`Community Valais` has a legacy slug (`community-central`) while its region link
is correct — slug cleanup deferred.
