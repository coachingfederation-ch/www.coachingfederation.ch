# Chat Agent Insights

Log what visitors ask the chat assistant and how well it answers, then show those insights on a new admin-only CMS page. No transcripts, no questions, no personal data.

## What gets logged

One row per assistant answer, written after the answer has already been sent to the visitor:

- Date and time
- Anonymous session id (random id kept in the visitor's browser, not linked to any account)
- Question category and an optional short category detail (a few words, no visitor text)
- Language of the conversation
- Answer outcome: successful / partially successful / escalated / unsuccessful / unknown
- Whether the contact email or contact option was shown
- Whether the visitor clicked it
- Escalation reason, when relevant
- Optional "Was this helpful?" answer

Nothing else. The visitor's question, the answer body, email addresses and IP addresses are never stored.

## How the category and outcome are decided

After the answer has finished streaming, a small, cheap classification step runs on the server and picks the category, a short detail, the outcome and any escalation reason. Two facts are taken from the run itself rather than guessed: whether the answer showed the contact address or pointed to the contact page, and whether the answer failed or errored. If the classification step fails or times out, the row is still written with category "other" and outcome "unknown".

This happens entirely after the visitor's answer is delivered, so it can never slow down or break the chat.

## Categories

Seeded with: membership, membership application, membership renewal, credentialing, coach search, events, education and training, resources, chapter information, website or technical support, contact request, other.

They live in a database table with labels per language and an active flag, so an admin can rename, deactivate or add categories from the new CMS page without a code change. The classifier is given the current active list each time.

## In the chat widget

- Under each completed answer: a quiet "Was this helpful?" line with Yes / No. One click records the feedback and the line collapses to a short thank-you. Fully optional, keyboard accessible.
- When the visitor clicks the contact email or the contact link inside an answer, the click is recorded for that interaction and the link still opens normally.
- A random anonymous session id is stored next to the existing conversation in the browser and cleared by "Start over".

## CMS page — Chat Agent Insights

New protected page at `/manage/chat-insights`, reachable from the CMS sidebar, visible to admins only.

**Period selector:** last 7 / 30 / 90 days or a custom range.

**Overview cards:** total interactions all-time, interactions in the period, successful-answer rate, escalation rate, contact-email-shown rate, helpful rate (of the answers that got feedback, with the response count shown).

**Charts:** questions by category (bar), answer outcomes (donut), contact-email referrals over time (line), helpful vs not helpful (bar).

**Detailed log:** searchable, filterable table — date and time, category, detail, language, outcome, contact shown, contact clicked, feedback, escalation reason. Filters for date range, category, outcome, contact status, language and feedback. Export the currently filtered rows as CSV.

**Categories:** a small section at the bottom to rename, reorder, deactivate or add a category.

Layout follows the existing CMS reporting screens (same shell, cards, filter bar, chart style) and collapses to a single column with a horizontally scrollable table on mobile. All labels authored in English and German, with French and Italian filled through the existing translation flow.

## Technical notes

- **Database (one migration):**
  - `chat_question_categories` — slug, label_en/de/fr/it, sort_order, is_active. Seeded with the twelve categories. Public read of active rows is not needed; admin read/write, service_role all.
  - `chat_interaction_logs` — id (client-supplied uuid), session_id, occurred_at, category_slug, category_detail (text, max ~80 chars), locale, outcome enum, contact_shown bool, contact_clicked bool, escalation_reason text, feedback enum (`helpful` / `not_helpful`), created_at.
  - Grants + RLS: `service_role` all; `authenticated` SELECT gated to `private.has_role(auth.uid(),'admin')`; no `anon` access. Writes only from the server.
  - Indexes on `occurred_at`, `category_slug`, `outcome`.
- **Write path:** `src/lib/assistant/logging.server.ts`, called from `onFinish` in `src/routes/api/chat.ts`. Uses the admin client, wrapped in try/catch that only logs to console. Classification uses `generateObject` against `google/gemini-3.6-flash-lite` through the existing gateway helper, with a hard token cap.
- **Feedback and click:** `src/routes/api/public/chat-signal.ts` — POST `{ interactionId, kind: 'feedback'|'contact_click', value }`, validated with Zod, behind `checkRateLimit` (per session/IP), updates only that row's feedback/contact_clicked columns.
- **Widget:** `src/components/assistant/AssistantWidget.tsx` gains the session id, the per-message interaction id sent in the request body, the feedback row and the contact-link click hook.
- **CMS:** `src/lib/chat-insights.ts` (client-safe vocabulary + filter shape), `src/lib/chat-insights.functions.ts` (admin-guarded aggregate, list and CSV server functions using `assertAdmin`), route `src/routes/_staff/manage.chat-insights.tsx` with `requireStaffAccess(queryClient, ADMIN_ONLY)`, components under `src/components/cms/chat-insights/`. Charts use the already-installed `recharts`.
- **i18n:** new `chatInsights.*` and `assistant.feedback.*` keys in `cms.json` / `assistant.json` for all four locales.

## PR note

**Summary** — Adds privacy-preserving analytics for the site chat assistant: one metadata-only row per answer, an optional helpfulness vote, contact-referral tracking, and an admin-only "Chat Agent Insights" CMS page with KPIs, charts, a filterable log and CSV export.

**Changes**
- UI (public): feedback row and contact-click tracking in the assistant widget; anonymous session id in local storage.
- UI (CMS): new admin-only Chat Agent Insights page (overview, charts, filterable log, CSV export, category management) plus a sidebar entry.
- Backend: post-answer classification and logging in the chat route, a rate-limited public signal endpoint, admin-guarded reporting server functions.
- Schema: two new tables with RLS, grants and seed categories.

**Backend / schema changes** — One migration creating `chat_question_categories` (seeded) and `chat_interaction_logs`, with an outcome enum, admin-only read policies, service-role writes and reporting indexes. No changes to existing tables.

**Testing & verification** — Signed-out and signed-in chat in all four languages; logging failure simulated to confirm the answer still streams; feedback and contact-click recorded once per interaction; rate limit on the signal endpoint; admin sees the page, editor/organizer/member are redirected; filters, charts and CSV agree on the same numbers; mobile layout.

**Risks & rollback** — Additive. Removing the nav entry and route hides the page; dropping the two tables removes the data. The classification step adds a small AI cost per answer and is fully isolated from the visitor's response.

**Follow-ups / known debt** — No retention/purge job for old log rows yet; no per-category drill-down into example sessions (deliberate, for privacy); classification quality should be spot-checked after the first weeks and the category list tuned.
