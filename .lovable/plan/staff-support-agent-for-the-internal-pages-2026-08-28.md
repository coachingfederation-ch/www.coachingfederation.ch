# Staff support agent for the internal pages

A friendly in-app helper for everyone working in the CMS. It explains how the
internal screens work, what each option does, and what happens as a
consequence — "if you switch this event to members only, it stops appearing in
the public list and registration is limited to signed-in members".

It never changes anything. It explains, and it can read the record you
currently have open so its advice is about your event, article or newsletter
rather than generic.

## What it looks like

- A soft animated orb button, bottom right, on every internal page (articles,
  events, newsletters, members, guest passes, roles, governance, …). Deep Blue
  body with a slow Yellow accent pulse, calming down while you read and
  breathing while it thinks. Reduced-motion users get a static orb.
- Clicking it expands into a compact chat panel in the same corner: agent
  greeting, suggested starter questions for the screen you are on, message
  list, one text box.
- One running conversation, kept in your browser only, with a "Start over"
  button. Nothing about these chats is stored in the backend.
- The public site assistant stays hidden on internal pages, so only one
  launcher is ever visible.

## What it knows

- The screen you are on, and the record open in it. When you ask "what happens
  if I publish this?", it reads that event/article/newsletter and answers about
  its actual settings — registration mode, ticket tiers, CCE status, audience,
  translation state, publish state.
- A staff help library that admins maintain in the backend. The existing
  "Assistant knowledge" screen gains an audience switch: entries are either
  Public (what the website assistant already uses) or Internal (only the staff
  agent sees them). Public visitors can never reach the internal entries.
- A short built-in map of the internal screens and what each is for, so the
  agent can always point you to the right place even before help entries exist.

We seed the internal library with a first set of entries covering the areas
that most often raise questions: article publishing and translations, event
registration modes and audiences, ticketing and refunds, CCE credits,
newsletters, guest passes, and roles.

## What it will not do

- No writing, no publishing, no sending, no data changes. If you ask it to do
  something, it explains where to do it yourself.
- No member personal data in its answers. Record lookups return settings and
  counts, never attendee names, emails or member numbers.
- No answers invented from thin air: when the help library and the open record
  do not cover a question, it says so and points to the right screen or to
  office@coachingfederation.ch.

## Technical section

**Database (one migration)**

- `assistant_knowledge` gains `audience` (`public` | `staff`, default `public`)
  and an index on `(audience, is_published)`.
- The public read policy narrows to `is_published AND audience = 'public'`; a
  new policy lets staff roles read published `audience = 'staff'` entries.
  Platform admins keep full management.
- Seed INSERTs for the initial internal help entries.

**Server**

- New route `src/routes/api/staff-assistant.ts`. Bearer token required; the
  handler resolves the user and verifies a staff role through the caller's own
  Supabase client before streaming. Rate limited per user through the existing
  `checkRateLimit`.
- `streamText` with `google/gemini-3.7-flash` through the existing gateway
  helper, `stopWhen: stepCountIs(8)`, `abortSignal: request.signal`.
- Tools in a new `src/lib/assistant/staff-tools.server.ts`, all read-only and
  executed with the caller's token so RLS applies:
  - `search_staff_help` — internal + public knowledge entries.
  - `describe_open_record` — event, article or newsletter by id; returns a
    compact settings summary with no personal data.
  - `explain_screen` — the built-in route map entry for a path.
- The system prompt carries the route map, the "explain, never act" boundary,
  the no-PII rule, and the chapter naming rules already used elsewhere.

**Client**

- `src/components/assistant/StaffAssistant.tsx` — orb launcher plus panel,
  built from the AI Elements primitives already in the project
  (`Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`) and
  design-system tokens only. Stop button wired to `useChat`'s `stop`.
- Mounted once in `src/routes/_staff/route.tsx` around `<Outlet />`, so it
  exists only behind the staff gate.
- Screen context (path, route id, record id) comes from `useRouterState` and is
  sent with each request.
- History in `localStorage` under a staff-specific key, cleared by "Start over".
- `src/routes/__root.tsx` hides the public widget on the internal path
  prefixes, from a shared constant.
- CMS copy added to the existing `src/i18n/cms` strings (de/fr/it/en); the
  agent answers in the CMS language you have selected.

## PR note

**Summary** — Adds a read-only support agent to the internal CMS that explains
screens, options and their consequences, and can read the record currently
open. Knowledge is maintained by admins in the existing assistant knowledge
screen, split by audience.

**Changes**
- UI: orb launcher + chat panel in the staff shell; audience switch and filter
  on `/manage/knowledge`; public widget suppressed on internal paths; new CMS
  strings in four languages.
- Backend: `/api/staff-assistant` streaming route with staff-role verification
  and rate limiting; read-only tool module; system prompt with the internal
  route map.
- Schema: `assistant_knowledge.audience` column, index, revised read policies,
  seeded internal help entries.

**Backend / schema changes** — One migration as described above. No new tables.
No chat content is persisted.

**Testing & verification** — Sign in as admin, editor, organizer and
membership: agent reachable for all, internal knowledge entries readable, no
write path available. Signed-out and member-only accounts get 401 from the
endpoint. Public assistant confirmed to return no internal entries after the
policy change. Behaviour checked on an event with ticketing, an unpublished
article and a draft newsletter, plus mobile width and reduced motion.

**Risks & rollback** — Main risk is the narrowed public read policy on
`assistant_knowledge`; existing rows default to `public`, so public answers are
unchanged. Reverting the code leaves the column in place harmlessly.

**Follow-ups / known debt** — Suggested starter questions are per screen and
hand-written at first. No usage logging for staff chats (deliberate, given the
browser-only history choice); if admins later want insight into which topics
come up, that needs its own decision.
