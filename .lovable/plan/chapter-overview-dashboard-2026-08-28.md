# Chapter overview dashboard

A new administrator-only dashboard at `/manage` that summarizes chapter activity across content, events, membership, the coach directory, and both chat channels — with a per-panel CSV export of the detail rows behind each summary.

## Access and placement

- Administrators only (same guard as the other platform-admin screens). Other staff roles keep their current landing behaviour.
- Becomes the CMS home: signing in as an administrator lands on `/manage`, and it is the first sidebar item ("Overview").

## Time range

Default **last 90 days**, with a range picker: 30 days / 90 days / 12 months / year to date / custom (from–to). Every panel, chart, and export respects the selected range. Cards that only make sense as a current state (for example directory composition or active members) show the live total and label it as such.

## Panels

1. **At a glance** — a KPI strip: published articles, newsletters sent, events held, total registrations, check-ins, new members, guest passes issued, chat conversations. Each KPI shows the change versus the preceding period of the same length.
2. **Content** — articles published over time by language and status, newsletters sent with block counts and send dates.
3. **Events** — events over time by status and category; registrations, attendance rate, and revenue trend; a breakdown of CCE events (CCE-enabled events, credits awarded, certificates issued) and guest passes (issued, redeemed, expired).
4. **Members** — member growth, activity state mix (active / grace / inactive), claimed accounts versus unclaimed, and last sync health.
5. **Coach finder** — directory composition: published profiles, credential mix (ACC / PCC / MCC), languages, regions, specialisations, and how many profiles are hidden and why. Note: the app does not log directory searches today, so this panel reports directory supply, not search demand. Search analytics would be a separate change.
6. **Conversations** — Chat Agent: conversations, outcome mix, escalation and helpfulness rates (reusing the existing chat-insights aggregation). Live Chat: conversations, messages, volunteer response coverage.

Each panel is a card with its headline numbers, one or two charts, and its own "Export CSV" button producing the detail rows behind that panel for the selected range.

## Visual design

Follows the existing CMS reporting language (`/manage/events/:id/reporting`): rounded token-surface cards, Recharts line/bar/donut charts using design-system colour tokens, a KPI grid at the top, and a sticky filter bar for the range picker. Localized in EN / DE / FR / IT like the rest of the CMS.

## Technical notes

- `src/lib/chapter-overview.ts` — shared types, range helpers, and the panel/metric definitions used by both the server aggregation and the UI.
- `src/lib/chapter-overview.server.ts` — one aggregation module reading through the admin client (the pattern `chat-insights.server.ts` already uses), returning the whole dashboard payload for a range plus the previous-period comparison. It also builds the per-panel CSVs so numbers on screen and in the export cannot diverge.
- `src/lib/chapter-overview.functions.ts` — two server functions behind `requireSupabaseAuth`, both asserting the administrator role before reading: `getChapterOverview({ from, to })` and `exportOverviewPanelCsv({ panel, from, to })`. CSV download reuses the blob-link pattern from the event reporting route.
- `src/routes/_staff/manage.index.tsx` — the route (`/manage`), admin-gated in `beforeLoad`, with `robots: noindex` head metadata.
- `src/components/cms/overview/` — `OverviewRangeBar`, `OverviewKpiGrid`, and one component per panel (`ContentPanel`, `EventsPanel`, `MembersPanel`, `CoachFinderPanel`, `ConversationsPanel`), each taking its slice of the payload plus an `onExport` callback.
- `src/components/cms/Shell.tsx` — add "Overview" as the first nav item, `allowedRoles: PLATFORM_ADMIN`.
- Wherever the CMS currently redirects after sign-in, send administrators to `/manage`; other roles keep their existing destination.
- `src/i18n/locales/{en,de,fr,it}/cms.json` — a new `overview.*` block.
- Read-only: no schema changes, no new tables, no RLS changes. Data comes from `articles`, `newsletters`, `events`, `event_registrations`, `event_cce_awards`, `event_certificates`, `guest_passes`, `members`, `member_directory_profiles` (+ its link tables), `chat_interaction_logs`, `live_chat_conversations`, and `live_chat_messages`.
- Aggregation is capped per source (same `SCAN_LIMIT` discipline as chat insights) so a wide range cannot pull unbounded rows into the worker.
- Exports contain operational detail; member and attendee exports carry names and emails, so both server functions stay admin-only and nothing is cached client-side beyond the current session.

## PR note

- **Summary** — Adds an administrator-only chapter overview dashboard at `/manage` summarizing content, events (incl. CCE and guest passes), members, the coach directory, and both chat channels, with per-panel CSV export over a selectable date range.
- **Changes** — UI: new `/manage` route, overview components, sidebar "Overview" entry, admin post-login landing. Server: new read-only aggregation and export server functions. i18n: new `overview.*` block in four locales.
- **Backend / Schema changes** — None. Read-only queries against existing tables.
- **Testing & Verification** — Sign in as administrator: dashboard loads, each KPI matches a spot-check query, each range option changes all panels, each panel's CSV downloads with the expected rows for the range. Sign in as editor / organizer / membership: no Overview item, `/manage` is refused, existing landing behaviour intact. Verify all four languages and empty-range states.
- **Risks & Rollback** — Read-only and additive; main risk is query cost on wide ranges, mitigated by scan caps. Rollback is removing the route, components, lib modules, and the nav entry.
- **Follow-ups / Known Debt** — No coach-finder search logging exists, so demand-side directory analytics is deferred; a scheduled snapshot table would be the next step if aggregation gets slow as data grows.
