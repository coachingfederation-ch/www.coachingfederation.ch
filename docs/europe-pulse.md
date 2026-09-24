# Europe Pulse

A weekly, multilingual digest of what the other ICF chapters in Europe are
doing. Public feed at `/europe-pulse` (plus the three `$locale/` mirrors),
staff control room at `/manage/europe-pulse`.

Nothing on the page is written by hand. Each item is scraped from a chapter's
own public website, summarised and translated by AI, and then either published
automatically or held for approval, depending on the chapter's publish mode.

## The weekly run

`icf-europe-pulse-scan-weekly` (pg_cron, Monday 06:00 UTC) POSTs to
`/api/public/europe-pulse-scan`, which runs `runEuropePulse()` in
`src/lib/europe-pulse.server.ts`. Staff can trigger the same run from the CMS.

```text
  chapters ──► paced Firecrawl scrape ──► AI extract ──► AI curate + translate
                (europe_pulse_raw)                        (europe_pulse)
```

1. **Scrape.** Each active chapter's URL is fetched through the Firecrawl
   connector as markdown, and the raw result is stored in `europe_pulse_raw`
   for the run.
2. **Extract.** A cheap AI pass turns the page into candidate items (type,
   title, description, URL, date).
3. **Curate.** A ranking pass picks the week's shortlist from the pool (it
   returns indexes only, so its output stays small). The picked items are then
   translated into DE/FR/IT in parallel chunks of eight, so no single AI call
   runs long enough to hit the request time limit. A failed translation chunk
   keeps those items in English instead of failing the run. The public page
   never makes a request-time AI call.

Only the most recent `week_of` is rendered as the feed; older rows stay as
archive.

## Rate limiting is the design constraint

Firecrawl allows roughly ten scrapes per minute on the current plan. The first
production run fired all 29 chapters in quick batches and lost 21 of them to
HTTP 429 — the chapters that succeeded were simply the ones that ran first,
alphabetically. Nothing was wrong with the other sites.

The engine therefore paces itself rather than relying on batch size:

- `takeScrapeSlot()` is a rolling-60-second token pacer capped at
  `SCRAPES_PER_MINUTE` (8, leaving headroom under the observed limit).
- `pacedScrape()` retries up to `MAX_SCRAPE_ATTEMPTS` times. On 429 it waits
  out the provider's own hint (`Retry-After` header, else the `retry after Ns`
  text in the body); on 5xx and network errors it backs off exponentially with
  jitter. Other 4xx are configuration problems — a bad URL or a revoked key —
  and fail immediately rather than burning three attempts.
- `BATCH_SIZE` is 2. Throughput is the pacer's job, not the batch's.

A full 29-chapter run therefore takes minutes, not seconds. That is fine for a
weekly cron, and the CMS run button reports progress.

## Failures are classified, not just logged

`classifyFailure()` maps every error to one `FailureKind`:

| Kind             | Meaning                                        | Action                                  |
| ---------------- | ---------------------------------------------- | --------------------------------------- |
| `rate_limit`     | 429 after all retries                          | Usually self-healing; retry the run     |
| `upstream_error` | 5xx or a network failure                       | Transient; retry                        |
| `not_found`      | 404/410 — the chapter moved or renamed a page  | Fix the chapter URL in the CMS          |
| `empty_page`     | Scrape succeeded but yielded no usable content | JS-only site; needs a different source  |
| `other`          | Any other 4xx                                  | Configuration — check URL and connector |

The kind is stored on the `europe_pulse_raw` row and mirrored onto the chapter
as `last_status`. `europe_pulse_chapters.consecutive_failures` counts runs that
failed the same way in a row, so a chapter that is chronically broken (rather
than momentarily unlucky) is visible in the CMS list instead of quietly
disappearing from the feed.

## Staff control room

`/manage/europe-pulse` (admin) offers:

- **Run scan now** — the same run as the cron.
- **Failed chapters** for the latest run, each with its plain-language cause,
  and **Retry failed chapters**, which re-scans only those and re-curates the
  week so the gaps fill in.
- Per-chapter editing: URL, active flag, and publish mode (`automatic` publishes
  curated items straight away; `manual` holds them as `pending`).
- Per-item approval, hiding and re-ordering (`sort_rank`).

## Security notes

- The cron endpoint sits under `/api/public/` (so it bypasses site auth) and is
  protected by the `x-cron-token` shared secret, exactly like the member sync.
  It is deliberately **not** the publishable key: that key ships to every
  browser, and anyone could then burn Firecrawl and AI credits at will.
- Firecrawl and Lovable AI keys are read inside the handler, never at module
  scope, and never reach the browser.
- The public feed is read with the publishable-key client, so RLS
  (`status = 'published'`) is what decides visibility — not application code.

## Translations

Static UI strings (`src/i18n/locales/*/europe-pulse.json`) are translated once
at build time by `scripts/translate.ts`. The weekly run only translates scraped
_content_. Those are two separate pipelines; changing chapter content never
touches the UI strings.
