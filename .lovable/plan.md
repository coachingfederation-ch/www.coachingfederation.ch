# AI-driven Newsletter editor

A monthly newsletter, composed from an ordered list of blocks, sitting next to the Insights CMS at `/newsletters`. Asset blocks are assembled by AI from live platform data; President's Message and Specific Content are written by editors with the full article-editor experience; advertisement slots and Brevo sending are marked stubs.

## Decisions taken from your answers

- **Project updates (ICFS Aspire)** ships as an editor-filled block with a note that a live Aspire feed follows later. No invented data shape.
- **Friday refresh notification**: email to accounts holding `editor` or `publisher`, through the existing transactional email pipeline.
- **Preview**: staff-only inside the CMS. Published editions are additionally readable on a public newsletter archive under `/insights`, added as a navigation option alongside `/europe-pulse` — locale-prefixed routes `/newsletters` (archive list) and `/newsletters/$issue` (single edition), rendering enabled blocks in order with their own `head()` metadata. Read through a narrow public view exposing published editions only.

## Data model

Three tables, following the articles conventions (GRANTs, RLS, publish-guard trigger).

- `newsletters` — `id`, `title`, `status` (`draft`/`review`/`scheduled`/`published`/`unpublished`), `issue_date`, `scheduled_at`, `published_at`, `first_published_at`, `language`, `last_refreshed_at`, `created_by`, timestamps.
- `newsletter_blocks` — `id`, `newsletter_id`, `block_type`, `title`, `content` (markdown), `enabled`, `position`, `source_refs` (jsonb), `source_fingerprint` (text, for skip-if-unchanged), `generated_at`, `featured_image_url`, `created_by`.
- `newsletter_send_config` — one marked-stub row per newsletter holding a `provider` = `brevo` placeholder and a free-text note. No credentials, no delivery.

`tg_newsletters_publish_guard` mirrors `tg_articles_publish_guard`: moving to `published`/`scheduled` requires the `publisher` role and the actor must not be `created_by` (admin may override the self-publish block only). RLS: editorial roles read/write drafts; nothing is exposed to `anon`.

Block roster (default order, seeded on creation):
President's Message (content) · Specific Content (content) · Advertisement (stub) · Insights (asset) · Advertisement (stub) · Volunteering Options (asset) · Organization updates (asset, count only) · Project updates (editor-filled, Aspire stub) · Newest asked questions (asset) · Europe Pulse (asset) · Bad Joke (asset) · Upcoming Events (asset).

## Generation

`src/lib/newsletter-sources.server.ts` gathers each asset block's source data server-side through RLS-safe queries: published articles since the previous edition, open volunteer roles, a **count** of new community members, chat-insight topic trends, the latest published `europe_pulse` week, upcoming published events. No emails, phone numbers or member numbers ever enter a prompt.

`src/lib/newsletter-generate.server.ts` runs one AI call per asset block through `ai-gateway.server.ts`, writes `content` + `source_refs` + `source_fingerprint`. Empty source data produces a graceful "nothing new this period" block that is left disabled by default — never silently dropped. Content blocks and ad stubs are never touched by generation.

"Generate all" and "Regenerate block" are `createServerFn` calls in `newsletter.functions.ts`, gated by the article staff roles.

## Editor UI (`/newsletters`, `/newsletters/$id`)

- Block list is the editor: each card shows title, rendered markdown, and (for asset blocks) a source-refs footer so the editor can audit what the AI read.
- Per card: enable/disable toggle, drag-to-reorder with up/down button fallback, Regenerate and Discard generation (asset blocks), Edit content.
- The two content blocks expand in place into the article-editor experience — `MarkdownEditor` + `AiAssistPanel` preview-then-apply + featured image.
- Add-block palette to insert further editorial or specific-content blocks.
- Sidebar mirrors `ArticleMetaSidebar`: status pill, issue date, created/updated, schedule controls, four-eye transitions (Submit → Review → Publish) with the publisher/non-author gate and refetch-on-refusal.
- "Preview newsletter" renders all enabled blocks in order in an email-like frame. "Send via Brevo" sits beside it, **disabled**, labelled as a pending integration.
- Autosave covers title and block title/content only — never status, schedule or position ordering commits.

## Scheduled cadence

Two `pg_cron` jobs hitting shared-secret-guarded routes under `src/routes/api/public/`, matching the Europe Pulse pattern:

- **Monthly** — creates next month's newsletter with the default roster and runs the full assembly, leaving it in `draft`. Never reuses or overwrites a prior edition; idempotent per issue month.
- **Friday** — refreshes only the asset blocks of the current unpublished edition against fresh data. Skips blocks whose source fingerprint is unchanged, never touches editor-authored content, ad stubs, status or schedule. Afterwards emails editors/publishers a summary, flagging any block whose generation failed.

Both runs are bounded (fixed block roster), take a lease row so two runs never overlap, record per-block progress, and halt on a `402`/`403` from the gateway with a persisted paused state that both entry points check.

## Technical notes

- All AI calls server-side via `createLovableAiGatewayProvider`; `LOVABLE_API_KEY` never reaches the browser.
- Route files: `src/routes/_staff/newsletters.index.tsx`, `newsletters.$id.tsx`, guarded by `ARTICLE_ROLES`.
- New libs: `newsletters.ts` (types), `newsletters.server.ts` (state machine + persistence), `newsletters.functions.ts` (RPC), `newsletter-sources.server.ts`, `newsletter-generate.server.ts`, `newsletter-refresh.server.ts`.
- Components under `src/components/cms/newsletter/`: `NewsletterBlockList`, `NewsletterBlockCard`, `NewsletterContentBlockEditor`, `NewsletterMetaSidebar`, `NewsletterPreview`, `NewsletterSendStub`.
- Every new static string added to `en`, `de`, `fr`, `it` `cms.json`.
- Design-system components only (cards, panels, status pills, toasts); no parallel visual language.
- No real member data in code, prompts, fixtures or docs — placeholders only.

## PR note

**Summary** — Adds a block-composed, AI-assembled monthly newsletter editor to the staff CMS, mirroring the Insights article pipeline including its four-eye publish rule. Sending and the Aspire feed are explicit stubs.

**Changes** — Staff routes `/newsletters` and `/newsletters/$id`; newsletter block components; server libs for sources, generation, refresh and the state machine; two cron endpoints; i18n keys in four locales.

**Backend / schema** — New tables `newsletters`, `newsletter_blocks`, `newsletter_send_config` with GRANTs and RLS; `tg_newsletters_publish_guard` trigger; two `pg_cron` jobs (monthly create, Friday refresh) calling shared-secret `/api/public` routes.

**Testing & verification** — Create → generate all → edit content blocks → reorder/disable → preview → submit → publish as a second account holding `publisher`; self-publish attempt must be refused by the trigger, not just the UI. Cron endpoints invoked manually with and without the secret. Refresh run verified to leave editor-authored blocks and status untouched.

**Risks & rollback** — Additive only; no existing table or route changes. Rolling back the code leaves the tables unused and harmless; the cron jobs must be unscheduled separately. Gateway spend is bounded by the fixed block roster and the fingerprint skip.

**Follow-ups / known debt** — Brevo delivery and send configuration; live ICFS Aspire project feed; public newsletter archive route; per-recipient personalization; the advertising feature behind the two ad stubs.
