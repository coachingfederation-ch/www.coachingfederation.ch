# Article feedback: steer the editorial

Readers reach the end of an article and, instead of a thumbs up or down, tell us
how the piece landed and where they want the editorial to go next. Two quick
dials, a set of "what next" topic chips, and an optional sentence in their own
words. AI turns the free text into editorial themes for the team.

Plus a small addition: an approximate reading time at the top of every article.

## What the reader sees

```text
[ article ends ]

  How did this land?

  Depth        too light  ---o-------  too deep
  Usefulness   interesting  -----o---  I'll use this

  What should we write about next?
  ( peer supervision ) ( AI in coaching ) ( pricing & positioning )
  ( team coaching ) ( ...from this article's category )   + your own

  One sentence, if you like  [                          ]
  Email, only if you want a reply  [                    ]   (optional)

  [ Send signal ]  ->  "Thank you — this shapes what we publish next."
```

- No sign-in. Anonymous by default; the email field is clearly optional and only
  used to reply.
- Both dials are keyboard-operable sliders with visible labels at each end and a
  live text value, not colour alone.
- One submission per reader per article, remembered in the browser; the panel
  then shows the thank-you state with an "edit my answer" link for the session.
- The topic chips are a short managed list plus the current article's category
  topics, and readers can add their own.

## Reading time

A small line next to the byline: "6 min read", computed from the article body
at ~200 words per minute (words counted after stripping Markdown syntax), shown
in all four languages. Purely presentational, no new data.

## Where the team sees it

- **Per article** — a "Feedback" tab in the article editor: response count, the
  two dial averages, the topics readers asked for, the raw sentences, and an AI
  summary of what to change in this piece.
- **Chapter-wide** — `/manage/editorial-signals`: distribution of the dials over
  time and by category, the most requested topics ranked, and an AI-clustered
  view of the free text into editorial themes ("readers want more on pricing",
  "long pieces land as too deep for newer coaches"), each theme showing the
  quotes behind it. Filters by locale, category and date, CSV export — matching
  the existing chat-insights dashboard.

## Technical section

- **Table** `article_feedback`: `id`, `article_id`, `locale`, `depth` and
  `usefulness` (smallint 1-5), `topics text[]`, `comment text`, `email text`,
  `ip_hash`, `created_at`. RLS on. `GRANT INSERT ON ... TO anon, authenticated`
  for the submit path only (no `SELECT` for either role); staff reads go through
  the admin client in a server function gated by the existing editorial roles;
  `GRANT ALL ... TO service_role`.
- **Submit**: a public server route `src/routes/api/public/article-feedback.ts`
  (Zod-validated, honeypot, `checkRateLimit` with an `article-feedback` bucket
  per IP — e.g. 10/hour, 30/day) following the `chat-signal.ts` pattern. The IP
  is stored hashed only, for abuse control.
- **Topics**: reuse the existing vocabulary tables for the managed chip list, so
  the team can curate suggestions without a migration.
- **AI**: `src/lib/editorial-signals.server.ts` calls the Lovable AI Gateway with
  a strict structured-output schema to cluster comments into themes and to write
  the per-article summary. Results cached in `article_feedback_themes` and
  refreshed on demand from the dashboard, so opening a page never triggers a
  model call. Gateway errors surface as a retry state, never a silent blank.
- **Reading time**: a pure helper in `src/lib/articles.ts`
  (`readingMinutes(content)`), rendered in `InsightDetail.tsx` next to the date.
  One new i18n key per locale (`insights.detail.readingTime`, "{n} min read").
- **Components**: sliders, chips, inputs and cards all from the ICF design
  system; the panel sits on the base surface below `ShareBlock`, following the
  section rhythm.
- **Privacy**: `/privacy` gains a short paragraph — feedback is anonymous,
  an email is stored only when the reader gives one, and rows are kept 24
  months; the existing purge pattern covers deletion.

## PR note

- **Summary** — Replaces "no feedback at all" on articles with a two-dial,
  topic-driven signal panel that tells the editorial team how pieces land and
  what to publish next, plus AI theme clustering for staff and an approximate
  reading time on every article.
- **Changes** — UI: feedback panel on `/insights/:id`, reading-time line,
  Feedback tab in the article editor, new `/manage/editorial-signals` dashboard,
  i18n in four languages. Backend: public submit route with rate limiting,
  staff read/aggregate server functions, AI clustering helper.
- **Backend / Schema Changes** — new tables `article_feedback` and
  `article_feedback_themes` with RLS, insert-only `anon` grant and service-role
  grants; no changes to existing tables.
- **Testing & Verification** — submit as an anonymous visitor and as a signed-in
  member; duplicate submission blocked and thank-you state restored on reload;
  rate limit returns the friendly cap message; staff tab and dashboard render
  with real rows and with zero rows; AI clustering exercised against the gateway
  and its error state checked; keyboard and screen-reader pass on the sliders and
  chips; reading time correct for short, long and image-heavy articles; all four
  locales.
- **Risks & Rollback** — blast radius is the article detail page plus two new
  staff surfaces. Rollback = hide the panel and the reading-time line; the tables
  can stay harmlessly.
- **Follow-ups / Known Debt** — no per-reader identity, so counts are
  best-effort; no email reply workflow in the CMS (addresses are visible to staff
  and answered from the office inbox); theme clustering is refreshed manually
  rather than on a schedule.
