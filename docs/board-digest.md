# Board digest

A periodic summary email for the board, configured on **Integration → Members →
Board digest** (platform admins only).

## What it contains

Covering the days since the previous digest (7 or 14, by cadence):

- **At a glance** — the Overview dashboard KPIs (`buildChapterOverview`) with the
  change against the preceding equal period.
- **Members** — new members (name, credential, city), member changes (engagement
  campaign sends: credential upgrades, specialisations, returns from grace),
  members who entered the grace period, members deactivated by the sync, and the
  current retention counts (`loadRetentionSummary`).
- **New articles** — title, author, status.
- **New events** — title, organizer, community (or city/venue/online), date, status.
- **Assistant** — conversation count, answer/escalation/helpful rates, top
  categories, and escalated topics (`buildChatInsightReport`).
- **Operational structure change log** — volunteer assignments and removals
  (member, community/role, date, who made the change) from `op_assignment_audit_log`.

Lists are capped at 15 items ("and N more"). Member names appear; emails and
phone numbers never do. Each section can be switched off.

## Sending

- One recipient only: a group mailbox (default `directors@coachingfederation.ch`).
  App emails go to one address per send; the mailbox fans out to the board.
- pg_cron job `icf-board-digest-hourly` (minute 17) posts to
  `/api/public/board-digest` with the cron token (`BOARD_DIGEST_CRON_TOKEN`, falling
  back to the shared token). `isDigestDue` sends only at the configured Zurich
  weekday/hour and when at least cadence−1 days passed since `last_sent_at`.
- "Send a test now" sends immediately with a `[Test]` subject and does not move the
  schedule. "Preview" renders the exact email in a sandboxed frame.
- Settings and last status live on `integration_config.board_digest_*`.

## Files

- `src/lib/board-digest.ts` — types, cadence rule, section defaults (tested).
- `src/lib/board-digest.server.ts` — data assembly and send.
- `src/lib/board-digest.functions.ts` — admin server functions.
- `src/lib/email-templates/board-digest.tsx` — the email (English).
- `src/components/cms/BoardDigestCard.tsx` — settings card.

## Later

- "New advertisement inquiries" section: add a block in `buildBoardDigest`, a key in
  `DIGEST_SECTIONS`, and a section in the template.
