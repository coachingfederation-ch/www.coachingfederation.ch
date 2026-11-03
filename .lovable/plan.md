# Member data protection: audit log, rate limits, scraping throttle, staff idle timeout

## Goal
Make every bulk read of member data traceable, slow down mass extraction (by staff accounts or scrapers), and sign out idle staff sessions.

## 1. Access audit log (Tier 1, item 1)
- New table `member_access_log`: `id`, `actor_user_id`, `action` (`members_list`, `members_export`, `member_detail`), `subject_member_id` (nullable, detail views only), `row_count`, `ip`, `user_agent` (truncated), `created_at`.
- Append-only: no update/delete grants for anyone; insert only from server code; SELECT only for admins via `has_role`.
- Written by `listMembers`, `exportMembersCsv` and `getMemberDetail` after the role check succeeds. Logging failure does not block the request (logged to console), matching the fail-open rate limiter.
- Admin view: a "Member data access" panel under Integration → Advanced and Setup listing the last 100 entries (actor email, action, rows, time), with a 90-day retention note. Old rows are purged by the existing lifecycle cleanup after 12 months.

## 2. Rate limits on staff member endpoints (Tier 1, item 2)
Uses the existing `checkRateLimit`, keyed per user id:
- `exportMembersCsv`: 3 per hour, 10 per day.
- `listMembers`: 60 per 15 minutes.
- `getMemberDetail`: 120 per 15 minutes.
- Blocked calls return a localized "Too many requests, try again later" message and are also written to the audit log as `*_blocked`.

## 4. Coach Finder scraping throttle (Tier 1, item 4)
- `queryCoachDirectory` and `getPublicCoachProfile` get per-IP limits: 120 per 10 minutes and 1,000 per day for search; 200 per 10 minutes for profiles. Normal browsing stays far below this.
- When blocked, the Coach Finder shows a calm localized notice instead of results; no error page.
- The page size cap stays server-side (already enforced by config).

## 7. Staff idle timeout (Tier 2, item 7)
- In the staff area shell, an inactivity timer (mouse, keyboard, touch, visibility) signs the user out after 30 minutes of no activity, shared across tabs via `localStorage` timestamp.
- At 28 minutes a dialog warns "You will be signed out in 2 minutes" with "Stay signed in".
- After sign-out the user lands on `/auth?next=<current staff page>` (sanitized by the existing safe-next helper).
- Member Area is not affected.

## Technical details
- Migration: create `member_access_log` with GRANT (SELECT to authenticated, ALL to service_role), RLS, admin-only SELECT policy; index on `created_at desc` and `actor_user_id`.
- Helper `src/lib/member-access-log.server.ts` (`logMemberAccess`), insert via `supabaseAdmin` loaded inside the handler after authorization; IP from `clientIp(getRequest())`.
- Rate-limit buckets: `staff_members_export`, `staff_members_list`, `staff_member_detail`, `directory_search`, `directory_profile`.
- Idle timer: `src/hooks/useIdleSignOut.ts` mounted in `StaffShell`; dialog uses design-system `AlertDialog`; strings in EN/DE/FR/IT.
- Limitation: the idle timeout is client-enforced; a stolen refresh token is not shortened by it. Shortening token lifetime globally would also affect members and is out of scope.
- Tests: unit tests for limit rules (export blocked on the 4th call in an hour) and idle-timer threshold logic.

## PR note
**Summary:** Adds an append-only audit trail and per-user rate limits for staff member-data reads, per-IP throttling on the public Coach Finder, and a 30-minute idle sign-out in the staff area.

**Changes**
- Backend: `member_access_log` table + logging in three member server functions; rate limits on five endpoints.
- UI: audit panel in Integration; Coach Finder throttle notice; idle warning dialog in staff area.
- Docs: `docs/architecture.md` (security section), `docs/code-map.md`, `docs/member-sync.md` or member admin doc, `AGENTS.md` rule for access logging.

**Backend / Schema Changes:** one migration creating `member_access_log` with admin-only read RLS.

**Testing & Verification:** unit tests for limits and idle logic; browser check as admin: export logs a row, panel shows it, 4th export blocked; idle timer verified with shortened test threshold.

**Risks & Rollback:** limits too tight could block legitimate admin work; values are constants and easy to raise. Reverting code leaves the table harmless.

**Follow-ups / Known Debt:** MFA (item 5), step-up confirmation (item 6), sync anomaly guard (item 3), alerting on blocked/large exports (Tier 3).
