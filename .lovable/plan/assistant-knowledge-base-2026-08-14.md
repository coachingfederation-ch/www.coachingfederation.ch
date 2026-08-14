# Assistant knowledge base

Give admins a place in the CMS to write FAQs and knowledge snippets that the site assistant can use when answering visitors.

## How it works for you

A new admin-only page **Assistant knowledge** in the CMS lists all entries. Each entry has:

- Type: **FAQ** (question + answer) or **Knowledge** (title + text)
- Title / question
- Answer / body (plain text, short markdown allowed)
- Keywords (optional, comma-separated — helps the assistant find the entry)
- Published toggle (drafts are never used by the assistant)
- Optional link path (e.g. `/for-coaches`) the assistant can offer

Write entries in one language only. The assistant answers in the visitor's language and translates on the fly, so no per-language fields and no translation workflow.

The list supports search, filtering by type and status, editing inline in a dialog, and deleting. Each row shows when it was last updated and by whom.

## How the assistant uses it

The assistant gets a new lookup tool `search_knowledge`. When a visitor asks something that is not a coach, event, article or community query, the assistant searches the knowledge base first and answers from the matching entries, citing the link path if the entry has one. If nothing matches, it behaves as today (says so plainly and offers the relevant page or office@coachingfederation.ch).

The system prompt gets one added instruction: use `search_knowledge` for questions about the chapter, membership, credentials, processes and policies, and never invent an answer that the knowledge base does not support. The curated `CHAPTER_KNOWLEDGE` file stays as the small always-on backbone.

Chat Agent Insights keeps working unchanged; entries are not logged.

## Technical notes

**Database** — new table `public.assistant_knowledge`:
`id`, `kind` (new enum `assistant_knowledge_kind`: `faq`, `note`), `title`, `body`, `keywords text[]`, `link_path`, `is_published`, `created_by`, `updated_by`, `created_at`, `updated_at` (touch trigger reusing `tg_touch_updated_at`).

Access: `GRANT SELECT ON ... TO anon, authenticated` restricted by an RLS policy that only exposes published rows; full manage policy for admins via `has_role(auth.uid(),'admin')`; `GRANT ALL ... TO service_role`. Published entries are public-safe by design (they are answers the assistant would say out loud), so the anonymous read matches the coach/event pattern already used by the assistant tools.

**Assistant** — `src/lib/assistant/tools.server.ts` gains `search_knowledge` (input: `query`, optional `kind`, `limit` max 10) using the existing anonymous publishable client, `ilike` over title/body plus `keywords` overlap, published rows only, returning `{ title, body, link_path, kind }`. Text is sanitised with the existing `sanitise()` helper before reaching `.or()`.

**Prompt** — one extra bullet in `systemPrompt()` in `src/routes/api/chat.ts`; no other change to the streaming route.

**CMS** — new route `src/routes/_staff/manage.knowledge.tsx` guarded with `requireStaffAccess(queryClient, ADMIN_ONLY)`, built on `Shell`, with a nav entry in `src/components/cms/Shell.tsx`. Data access through a new `src/lib/assistant-knowledge.functions.ts` (list/upsert/delete) using `requireSupabaseAuth` plus an admin role check, mirroring the existing staff function pattern. Editing UI as `src/components/cms/knowledge/KnowledgeEditorDialog.tsx` + `KnowledgeTable.tsx`.

**i18n** — new `knowledge.*` keys in `src/i18n/locales/{en,de,fr,it}/cms.json` and a `nav.knowledge` label.

## PR note

**Summary** — Adds an admin-managed knowledge base (FAQs and free-form notes) that the public site assistant can search at answer time, so staff can extend the assistant without code changes.

**Changes**
- Backend/schema: new `assistant_knowledge` table + enum, RLS (public read of published rows, admin manage), touch trigger, grants.
- Assistant: new `search_knowledge` tool; one added system-prompt instruction.
- CMS: new admin-only `/manage/knowledge` page (list, search, filter, create/edit dialog, delete) and nav entry.
- i18n: `knowledge.*` and `nav.knowledge` keys in all four locales.

**Backend / schema changes** — one migration: create enum, table, grants, RLS policies, updated_at trigger. No data backfill.

**Testing & verification** — Admin can create, edit, unpublish and delete entries; editor/contributor accounts get no nav entry and are redirected. Anonymous chat request returns an answer sourced from a published entry and ignores an unpublished one. Verify empty-state and no-match behaviour, and that unrelated assistant flows (coaches, events) are unchanged.

**Risks & rollback** — Additive only; dropping the route and tool restores current behaviour, and the table can be left in place. Main risk is over-broad anonymous read, mitigated by the published-only policy.

**Follow-ups / known debt** — No per-language authored variants (translation is on the fly); no usage analytics per entry; no embedding/semantic search — keyword and substring matching only, which may need revisiting past a few dozen entries.
