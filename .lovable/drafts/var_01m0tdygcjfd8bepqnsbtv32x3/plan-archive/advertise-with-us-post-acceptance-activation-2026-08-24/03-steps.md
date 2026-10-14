## Steps

1. **Accept the draft.** The advertising tables, the click counter, the newsletter ad block link, the reminder stamp and rate card v1 all apply at that moment. The staff pages stop showing "not available yet".
2. **Review the price list.** Open the rate card editor in the CMS and compare every figure against the approved chapter rate card. If anything differs, save a new version — the editor is versioned, so old requests keep the price they were quoted.
3. **Schedule the nightly job.** Register a daily 03:15 Zurich run that calls the advertising upkeep endpoint with the shared cron token, using the same mechanism the member sync and Europe Pulse jobs already use.
4. **Verify.** Trigger the job once by hand and confirm it answers with a count of expired and reminded placements, then confirm the scheduled run appears in the job history the next morning.

## Technical details

- Endpoint: `POST /api/public/ad-upkeep`, authenticated by the `x-cron-token` header. It falls back to `MEMBER_SYNC_CRON_TOKEN`, which already exists, so no new secret is required.
- Schedule via `cron.schedule` + `net.http_post` against the stable preview/production host, mirroring the existing member-sync entry. This is a data operation (`run_sql`), not a migration, because it embeds the host and token.
- Cron runs in UTC: `15 1 * * *` UTC is 03:15 Zurich in summer (02:15 in winter). A once-nightly housekeeping job does not need DST precision.
- The handler is idempotent: `runAdPlacementUpkeep` only expires placements whose period has ended and stamps the reminder once, so a double run is harmless.

## PR note

**Summary.** Activates the already-built advertising feature after the draft merges: confirms the shipped rate card and puts nightly placement upkeep on a schedule.

**Changes.** No application code. One scheduled job registered in the database; optionally a new rate card version created through the existing editor.

**Backend / schema changes.** None beyond the already-staged advertising migration. The cron entry is a data operation.

**Testing & verification.** Manual call of the upkeep endpoint with the cron token (expect a JSON count, and 401 without the header); rate card figures compared against the approved list; job history checked after the first scheduled run.

**Risks & rollback.** Low. Worst case the job expires a placement a day late. Rollback is `cron.unschedule` on the job name; a wrong price is corrected by saving a further rate card version.

**Follow-ups / known debt.** No advertiser-facing performance view (clicks are staff-only), no impression tracking, no online payment — all intentionally outside MVP-1.
