# Europe Pulse: runs die mid-scan and never finish

## What I found

Both stuck runs are real, and they died the same way.

| Run | Started | Chapters scanned before it stopped | Last log line |
|---|---|---|---|
| Monday cron | 31 Aug, 08:00 Zurich | 20 of 29 (last at 08:04:59) | none — silence after the scan progress |
| Your manual run | 2 Sep, 17:12 Zurich | 17 of 29 (last at 17:14:46) | `scanned 16/29 ok=16 failed=0`, then nothing |

There is no error message anywhere: not in the run row, not in the raw rows (zero failed chapters, zero Firecrawl errors), not in the worker logs. The logs simply stop mid-scan. That is the signature of the server request being terminated, not of the code throwing — when the code throws, the `catch` writes `status = failed` plus an error message, which is why earlier failures always showed up properly.

Root cause: the entire run happens inside one HTTP request. Scraping is deliberately paced at eight Firecrawl calls per minute to avoid the rate-limit wipeout from 31 July, so 29 chapters need roughly four minutes of scraping, plus per-chapter AI extraction, plus the final curation and translation pass. The last three successful runs took 4m30s, 5m07s and 5m27s — already at the ceiling. With 29 active chapters the run now crosses the server's request lifetime and gets killed part-way through. The run row is only updated at the very end, so a killed run stays `running` forever and the week's items are never written.

Two secondary effects of the same design: the counters on the run row (`chapters ok`, `raw items`) stay at zero even though 17-20 chapters were actually scanned and stored, and nothing ever cleans up a run left in `running`.

## Yes — your understanding of the pipeline is correct

1. **Crawl** — Firecrawl scrapes each active chapter's homepage (markdown, main content only) through the Lovable connector gateway, paced at eight pages per minute with retries and back-off.
2. **Extract** — one AI call per chapter pulls up to five concrete items (events, news, webinars) out of that markdown, stored verbatim in the raw table so a bad week can be audited.
3. **Curate and translate** — one AI call ranks the pooled items down to the cap, spreads them across countries, normalises the type, and translates title and description into DE, FR and IT.
4. **Publish** — the week's rows are replaced wholesale; published immediately in automatic mode, held as `pending` in manual mode.

So the failure is not in Firecrawl or the AI: stages 1 and 2 were working fine on every chapter they reached. The run never survives long enough to reach stage 3.

## The fix

Turn one long run into a chain of short ones.

**1. Resumable runs.** The run row gains a cursor (how many chapters are done) and a phase (`scanning` / `curating` / done). One invocation processes a slice of chapters — about six, roughly a minute of work — writes its raw rows, updates the cursor and the counters, and returns. It then triggers the next slice itself; when the last chapter is scanned, the final invocation does the curation and translation pass and closes the run. Each individual request stays well inside the server's limit, and progress is durable: a killed slice loses at most that slice, not the week.

**2. A safety net for interrupted runs.** Any run still `running` with no progress for 15 minutes is marked `failed` with a clear message ("run was interrupted — resume or start again"), so the CMS never shows a phantom running job again. This also clears the two stuck rows.

**3. Resume, not restart.** The CMS panel gets live progress ("scanning 12 of 29") and a **Resume** action on an interrupted run that continues from the cursor instead of re-scraping everything. The existing retry-failed-chapters action stays.

**4. Manual runs stop depending on the browser.** Today the "Scan now" button holds the request open for the whole run, so leaving the page can cut it short. With slices, the button starts the run and the page polls progress — closing the tab no longer matters.

**5. Cron becomes a nudge as well as a trigger.** The weekly cron still starts the run; an additional short schedule (every five minutes, only while a run is unfinished) advances any run whose self-trigger was lost, so a run can never stall silently.

## Backfill

Once the fix is in, I start one run for the current week so the page shows the 31 August edition instead of the 24 August one. No data is lost — the raw rows already scraped this week stay and are reused by curation.

## Technical notes

- Columns added to `europe_pulse_runs`: `phase`, `cursor`, `heartbeat_at`. Counters written after every slice instead of only at the end.
- `runEuropePulse` splits into `startRun`, `advanceRun` (one slice) and `finishRun` (curate, translate, publish, close). The crawl, summarise and store modules are unchanged.
- Slice chaining uses a self-call to the existing public scan endpoint with the cron token and a `runId`, so it works identically for cron and manual runs; the endpoint stays token-authenticated.
- The stale-run reaper runs at the start of every invocation — no extra scheduler needed beyond the five-minute advance job.
- The Firecrawl pacer's rolling window currently lives in server memory. Split across invocations that window resets, so the per-slice size is chosen to respect the eight-per-minute budget on its own.

## PR note

**Summary** — Europe Pulse runs exceed the server request lifetime and are killed mid-scan, leaving runs stuck in `running` and the week unpublished. The run becomes resumable and is executed in short slices.

**Changes** — Run state machine (`phase`, `cursor`, `heartbeat`); sliced scan with self-chaining; stale-run reaper; CMS progress and Resume action; manual runs no longer tied to the open browser request; five-minute advance cron.

**Backend / schema** — Three columns on `europe_pulse_runs`; one additional pg_cron schedule. No changes to the pulse items, raw rows or chapter tables.

**Testing** — Start a full run and verify all 29 chapters are scanned across slices, the feed is published for the current week, and the run closes as `succeeded`; kill a slice mid-way and verify Resume continues from the cursor; verify the reaper closes the two currently stuck runs.

**Risks & rollback** — Additive columns; reverting the code leaves them unused. Worst case a run stalls again, and the reaper now makes that visible instead of silent.

**Follow-ups** — Per-chapter timing metrics to spot slow sites; an alert when a weekly edition ends up empty.
