# Grace-period emails driven by the membership expiry date

Today the three lapsing-member emails only start once ICF Global drops a member
from the data feed. In reality the feed keeps a lapsed member for two more
months, so by the time we react the member has already been gone for eight
weeks. This change starts the conversation at the expiry date instead.

Confirmed from the live data: 16 members are currently past their membership
expiry date and still arriving in the feed, so the two-month ICF grace is real
and visible to us.

## New timing

```text
membership expiry date
   |  re-engagement email  ("Member - grace period re-engagement")
   |  date named in the message = expiry + 2 months
   |
   + 1 month  -> first warning  ("Member grace period - first warning")
   |
   + 2 months - 7 days -> final warning ("Member grace period - final warning")
   |
   + 2 months (approx.) -> ICF drops them from the feed
                           -> Member Area access ends, record scheduled for
                              removal, staff confirm the clean-up (unchanged)
```

Everything after the feed drop stays exactly as it is: access ends when ICF
drops the member, not at the expiry date, and if a member is still in the feed
beyond two months we simply wait — no removal is started on our side.

A member who renews (expiry date moves forward in the feed) stops receiving the
sequence automatically, because every message is keyed to one expiry date.

## What staff see

All three emails appear on the Member engagement screen alongside the welcome
and credential campaigns, each with its own on / hold / off switch, daily cap,
waiting queue and send history — so the sequence can be piloted before it is
switched on. Wording keeps living in Cloud - Emails, in German, French, Italian
and English, and each member gets theirs in their correspondence language.

## Technical notes

- `src/lib/member-lifecycle.server.ts`: the nightly sweep stops sending the two
  warnings itself. It instead scans `members` with an
  `membership_expiration_date` in the past and queues rows into
  `member_engagement_sends` at the three milestones, dedupe-keyed as
  `<campaign>:<member_id>:<expiry_date>`, then calls
  `dispatchEngagementSends()`. Queue resolution, the overdue count and the
  office digest stay untouched.
- Milestones as named constants next to the existing lead times:
  `ICF_GRACE_MONTHS = 2`, first warning at expiry + 30 days, final warning 7
  days before expiry + 2 months. Members already anonymised, or without an
  email, are skipped.
- `src/lib/member-engagement.ts`: two new campaign keys,
  `grace_first_warning` and `grace_final_warning`.
- `src/lib/email-templates/member-campaign-copy.ts` + `member-campaigns.tsx`:
  the two warning stages resolve through the existing `graceNoticeCopy`, mapped
  to the already-registered `member-grace-notice` and
  `member-grace-final-notice` templates — no new templates, no new wording.
- `src/lib/member-engagement/detect.server.ts`: remove the feed-drop trigger for
  `grace_reengagement`; that campaign is now produced by the expiry sweep, with
  `grace_end_date = expiry + 2 months` instead of `scheduled_deletion_at`.
- `src/lib/member-engagement/dispatch.server.ts`: `variablesFor` reads
  `grace_end_date` from the trigger details (ISO date) as well as the legacy
  `scheduled_deletion_at`, so already-queued rows still render.
- Migration: a seed row for each new campaign key in
  `member_engagement_campaigns` (mode `off`, cap 50), matching the existing
  campaigns. No schema change, no new grants or policies.
- `member_lifecycle_queue.notified_at` / `final_notice_at` become unused; left
  in place and recorded in `docs/tech-debt.md` rather than dropped.
- Retention card on the integration screen gains a line for members past expiry
  and still in the feed, so staff see the sequence running before any drop.
- Docs: `docs/member-sync.md` (new timeline), `docs/operations-and-go-live.md`
  (retention section), `docs/code-map.md`.

## PR note

**Summary** — Moves the three lapsing-member emails from "feed drop" to the
membership expiry date, matching ICF Global's built-in two-month grace, and puts
all three under the existing Member engagement controls.

**Changes** — Server: expiry-driven milestone detection in the nightly sweep,
two new engagement campaigns reusing the existing warning templates, removal of
the feed-drop re-engagement trigger, `grace_end_date` now expiry + 2 months. UI:
retention card gains a past-expiry count. Docs updated.

**Backend / schema changes** — One migration inserting two campaign rows
(`grace_first_warning`, `grace_final_warning`, mode `off`). No table, grant or
policy changes.

**Testing & verification** — With the campaigns on hold: a member whose expiry
passed today produces exactly one re-engagement row naming expiry + 2 months; a
member 30 days past expiry produces one first-warning row; a member 7 days
before expiry + 2 months produces one final-warning row; re-running the sweep
the same day adds nothing; a renewed member (new expiry) produces nothing until
the new date; all four languages render; the endpoint still returns 401 without
the cron token.

**Risks & rollback** — The sequence ships with all three campaigns `off`, so
nothing mails until staff switch them on; suppression and the test-inbox
redirect still apply. Rollback is switching the campaigns off; the sweep then
only queues rows nobody sends.

**Follow-ups / known debt** — Unused `notified_at` / `final_notice_at` columns
on `member_lifecycle_queue`; no member-facing "I have renewed" self-service.
