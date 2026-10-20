# Weekly board digest email

A weekly email summarising what happened on the platform, sent to the board, with a
small settings card on the Integration page to control it.

## What the board receives

One email per week (default Monday, 7 a.m. Zurich), covering the previous seven days:

1. **At a glance** — the same headline numbers as the Overview dashboard (articles,
   newsletters, events, registrations, check-ins, new members, guest passes,
   assistant conversations), each with the change against the week before.
2. **Members** — new members, members whose status or credential changed, members
   who entered the grace period, and members who left or are due for removal
   (grace and retention).
3. **New articles** — title, author, status (draft or published).
4. **New events** — title, organizer, community or location, date.
5. **Assistant** — number of conversations, most common topics, and unanswered or
   flagged questions (from the existing assistant insights).
6. **Link to the full Overview dashboard** for anyone who wants more.

Long lists are capped (for example the first 15 items, then "and 8 more") so the
email stays readable.

**Later:** a "New advertisement inquiries" section, added once that area ships. The
digest is built so a new section is one extra block.

## Who receives it

The email goes to **one address** you enter, ideally the board's shared mailing list
(for example board@coachingfederation.ch). Our email service only allows app emails
to one recipient per send, so we rely on a group mailbox to forward it to every board
member. Board members who want it individually can be added to that group.

## Integration page: "Board digest" card

A new card in the Members/reporting area with:

- On/off switch
- Recipient address
- Cadence: weekly or every two weeks, plus day of the week
- Sections to include (members, articles, events, assistant)
- "Send a test now" button (sends the current week to the recipient)
- "Preview" that shows the email in the page
- Last sent date and result

Only platform admins can see or change it.

## Privacy note

The member section names individual members, so it contains personal data. It only
goes to the configured board address and is not stored as a file. Member names appear,
but no email addresses or phone numbers.

## Technical details

- **Settings**: new nullable/defaulted columns on `integration_config`
  (`board_digest_enabled`, `board_digest_recipient`, `board_digest_cadence`,
  `board_digest_weekday`, `board_digest_sections jsonb`, `board_digest_last_sent_at`,
  `board_digest_last_status`). Admin-only via existing RLS on that row; not exposed
  through `feature_flags()`.
- **Data**: `src/lib/board-digest.server.ts` reuses `chapter-overview.server.ts` for
  the KPI block (range = last 7 days) and `chat-insights.server.ts` for the assistant
  block, plus three list queries (members created/changed/grace, articles created,
  events created with organizer and community). Admin client, loaded only after the
  caller is authorised.
- **Email**: new React Email template `board-digest.tsx` in
  `src/lib/email-templates/`, registered in the registry, sent with
  `sendTemplateEmail` to the single configured address, idempotency key
  `board-digest-<week-start>`.
- **Schedule**: new cron route `src/routes/api/public/board-digest.ts`, protected by
  `isAuthorisedCronRequest` (`BOARD_DIGEST_CRON_TOKEN`, falls back to the shared token)
  and `checkRateLimit`. pg_cron calls it hourly at minute 17; the handler sends only
  when enabled, the weekday/hour match in Zurich time, and the cadence interval has
  passed since `last_sent_at`.
- **Admin functions**: `board-digest.functions.ts` with `getBoardDigestSettings`,
  `saveBoardDigestSettings`, `previewBoardDigest`, `sendBoardDigestTest`, all with
  `requireSupabaseAuth` plus platform-admin check.
- **UI**: `src/components/cms/BoardDigestCard.tsx` on `_staff/integration.tsx`.
- **i18n**: card labels in EN/DE/FR/IT. The email itself is in English (board working
  language); can be made selectable later.
- **Tests**: cadence logic (sends on the right weekday/hour, skips when sent within the
  interval, biweekly respects 14 days) and section filtering.
- **Docs**: new `docs/board-digest.md`; update `docs/code-map.md`, `AGENTS.md`.

## PR note

- **Summary** — Adds a weekly board digest email with overview numbers, member, article,
  event and assistant details, plus an admin settings card on Integration.
- **Changes** — UI: Board digest card. Backend: digest builder, email template, admin
  server functions, cron route. Config: one cron job, optional token.
- **Backend / Schema changes** — Additive columns on `integration_config`; one pg_cron job.
- **Testing & verification** — Cadence unit tests; preview and test send as admin;
  confirm non-admin staff cannot read or change settings; check email logs for delivery.
- **Risks & rollback** — Low. Switch off in the card; remove cron job to stop entirely.
  Columns are safe to leave if code is reverted.
- **Follow-ups / Known debt** — Advertisement inquiries section; optional German email
  version; per-member recipients are not supported (single group address by design).
