# Phase 5 — Event reporting and insights

A new staff-only reporting screen per event: `/manage/events/:id/reporting`, reachable from the event editor. It answers "how is this event selling, who is coming, what did we earn" without leaving the CMS.

## What the screen shows

**KPI summary** — confirmed, pending payment, cancelled, refunded, checked in, no-shows, capacity, remaining capacity, sell-through, gross ticket revenue, total refunds, net revenue, free registrations. Capacity-less events show "No capacity limit" instead of a fake percentage. Events with no check-in data show a "check-in not started" state rather than 0% attendance.

**Ticket-tier table** — one row per tier that either still exists or has historical registrations: name, active/inactive status, price snapshot, tier capacity, confirmed, remaining, sell-through, gross, refunds, net, check-ins. Inactive tiers stay listed whenever they carry sales.

**Trends** — confirmed registrations over time (paid vs free split), revenue over time, refunds over time, and check-ins over the event day. Daily buckets by default with a weekly toggle. Charts use the recharts library already in the project.

**Filters** — ticket tier, registration/payment status, check-in status, and a registration-created date range. Every KPI card, chart, table row and the CSV export read from the same filtered result, so the numbers on screen and in the file always agree.

**CSV export** — the filtered rows only, with an event title/ID and export-time header block, then per registration: ID, created time, name, email, tier, price snapshot, currency, status, payment status, amount paid, refund amount, net amount, and check-in status/timestamp.

## Counting rules

- Active attendance counts only confirmed registrations whose payment is `paid` or `not_required` and which are not refunded. Pending, expired, cancelled and refunded rows are excluded.
- Revenue counts only settled money: gross is the sum of `amount_cents` on paid registrations; free (`not_required`, 0) rows add nothing; pending adds nothing. Net = gross − refunds.
- No-shows = active attendance − checked-in.
- All money is integer cents server-side, formatted as locale-aware CHF in the UI (the existing `formatPrice` helper).

## Technical notes

- `src/lib/event-reporting.server.ts` — server-only aggregation. Reads registrations, tiers and the event through the trusted client after the caller's right to the event has been verified, applies the filter set, and returns a plain DTO: KPI block, tier rows, time series, and (for export) the row list. Cents in, cents out; no formatting server-side.
- `src/lib/event-reporting.functions.ts` — two server functions behind `requireSupabaseAuth` + `assertOrganizer`, plus an explicit ownership check against `context.supabase` (the caller's RLS-scoped client) so an organizer can only report on their own events, exactly as `exportEventRegistrations` does today: `getEventReport` and `exportEventReportCsv`. Unauthorized callers get the same `Forbidden`/`Event not found` failure as the rest of the events admin surface.
- `src/routes/_staff/manage.events.$id_.reporting.tsx` — the route, gated by `requireStaffAccess(..., EVENT_ROLES)`, `noindex` head, laid out with the existing CMS `Shell`.
- `src/components/cms/reporting/` — `ReportFilters.tsx`, `ReportKpiGrid.tsx`, `ReportTierTable.tsx`, `ReportTrends.tsx`. Presentational only; all numbers arrive computed.
- Tier status uses the existing `is_active` flag on `event_ticket_tiers` (there is no archive column); historical tiers are found by joining registrations' `tier_id` back to the tier list.
- A "Reporting" link is added to the event editor header next to the existing check-in link.
- New CMS translation keys in EN/DE/FR/IT under an `events.reporting.*` namespace.
- No schema change, no migration, no new dependency, and no change to the public registration flow.

## PR note

**Summary** — Adds a per-event reporting screen for organizers covering sales, attendance, capacity and revenue, with filters, trend charts and a filtered CSV export. Read-only; no changes to registration behaviour.

**Changes**
- UI: new reporting route and four presentational components under `src/components/cms/reporting/`; a link from the event editor; i18n keys in four languages.
- Backend: `event-reporting.server.ts` aggregation and `event-reporting.functions.ts` server functions (`getEventReport`, `exportEventReportCsv`), both organizer-gated.

**Backend / schema changes** — None. No migration, no RLS change.

**Testing & verification** — Against a ticketed event with free, paid, pending, cancelled and refunded registrations: KPI arithmetic, the 20-capacity/15-confirmed → 75%/5-remaining case, the 30-confirmed/24-checked-in → 80%/6-no-show case, capacity-less events showing no sell-through, an inactive tier with historical sales staying visible, filter-to-CSV consistency, and a non-staff account being refused both the route and the export.

**Risks & rollback** — Low blast radius: additive, read-only, no shared component touched other than the editor header link. Revert by deleting the new files and the link.

**Follow-ups / known debt** — No platform-wide finance dashboard, no cross-event comparison, no scheduled report email. Trend bucketing is computed in the server function rather than in SQL; if events grow past a few thousand registrations this should move to a database aggregate.
