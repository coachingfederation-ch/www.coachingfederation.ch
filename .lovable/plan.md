# Live volunteer chat

Visitors can talk to a real person from The Switzerland Chapter of ICF when a volunteer is on duty. The existing AI assistant stays as it is and gains a "Talk to a volunteer" handover; volunteers work from a phone page; admins keep a roster and hand out QR codes.

## How it works for each audience

**Visitor (public site)**
- The existing assistant launcher gains a small green dot and the label "Chat with us" when at least one volunteer is online; when nobody is on duty it stays as today (AI only, no green dot, no handover button).
- Inside the panel, a "Talk to a volunteer" button appears while someone is online. Tapping it asks for a first name and an optional email, then opens a live thread and pushes a request to the volunteers.
- States shown clearly: waiting for a volunteer, connected to "Anna", volunteer left, conversation closed. If nobody accepts within 2 minutes, the visitor is told so and offered the AI or office@coachingfederation.ch.
- The thread survives a reload in that browser (a private conversation key in localStorage) and messages arrive live.

**Volunteer (`/volunteer-chat`, mobile-first, signed-in members only)**
- Must be signed in; unauthenticated visitors are sent to the normal sign-in and back. The name is prefilled from their profile and editable (display first name only to visitors).
- A single "Go online / Go offline" switch. While online the page sends a heartbeat; closing the page or 90 seconds of silence marks them offline automatically.
- Dashboard: who else is online (green dots), incoming request cards with the visitor's name and first message plus an "Accept" button, and this volunteer's last 3 transcripts as collapsed expandable cards.
- Accepting opens the live thread full-screen with a composer and an "End chat" action. First acceptance wins; the card disappears for everyone else.

**Admin (CMS)**
- New page in the staff CMS at `/manage/live-chat` (the CMS lives under `/manage/*`, so this replaces the suggested `/admin/live-chat`), admin-only.
- Roster of scheduled volunteer windows: date, start/end, volunteer name/note. Create, edit, delete. The roster is informational — it never blocks anyone from going online and never drives the widget's online state.
- A QR code panel linking to `/volunteer-chat`, printable/downloadable, plus the plain link to copy.
- Live snapshot: who is online right now, open conversations, and today's counts.

## Privacy and safety

- Transcripts are deleted automatically 30 days after the conversation ends; a scheduled job runs the purge.
- Visitors give a first name and an optional email only; a line under the composer says the conversation is handled by a chapter volunteer and stored for 30 days.
- A visitor can only read their own conversation (unguessable conversation key); volunteers and admins read through their signed-in account.
- Creating a conversation and sending messages goes through the existing rate limiter.

## Technical notes

Database (new tables, all with RLS + explicit grants):
- `live_chat_shifts` — scheduled roster windows (admin-managed, staff read).
- `live_chat_presence` — one row per volunteer: `user_id`, display name, `is_online`, `last_seen_at`. A `TO anon` policy exposes nothing; the public widget reads only an aggregated online count through a security-definer function `public.live_chat_online_count()`.
- `live_chat_conversations` — `visitor_key` (hashed secret), visitor name, optional email, `status` (waiting / active / closed), `volunteer_user_id`, `locale`, `started_at`, `ended_at`.
- `live_chat_messages` — conversation id, `sender` (visitor / volunteer / system), body, `created_at`.
- Anonymous access is not granted directly on these tables. All visitor reads/writes go through server functions/routes that verify the conversation key; volunteer/admin access uses RLS scoped to `auth.uid()` plus `has_role`.

Realtime:
- Messages and conversation state use Supabase Realtime `postgres_changes` on `live_chat_messages` / `live_chat_conversations`, subscribed by the volunteer page (authenticated) and by the visitor widget through a per-conversation broadcast channel fed by the server, so no anon table read is needed.
- Volunteer presence uses the `live_chat_presence` heartbeat (30s) rather than ephemeral channel presence, so the public online indicator is readable server-side during SSR.

Code:
- `src/lib/live-chat.server.ts` (logic), `src/lib/live-chat.functions.ts` (server functions for volunteers/admins), `src/routes/api/public/live-chat.ts` (visitor start/send/poll-fallback, rate-limited), `src/routes/api/public/live-chat-purge.ts` (cron purge, token-authed like the existing cron routes).
- `src/components/assistant/` gains a `LiveChatPanel` reusing the installed AI Elements primitives (`Conversation`, `Message`, `PromptInput`) so the human thread looks identical to the AI thread; `AssistantWidget.tsx` gets the online dot and handover button.
- `src/routes/_member/volunteer-chat.tsx` (URL `/volunteer-chat`) — mobile-first, inside the existing member-authenticated layout.
- `src/routes/_staff/manage.live-chat.tsx` + nav entry in `src/components/cms/Shell.tsx` (admin only). QR code via the QR approach already used for event check-in tickets.
- New locale namespace `live-chat.json` for EN/DE/FR/IT; CMS labels into the existing `cms.json`.
- Styling uses existing ICF tokens: Deep Blue header/launcher, bone panel, volunteer bubble on the panel surface, visitor bubble Deep Blue on white text, green presence dot from the existing success token.

## PR note

**Summary** — Adds human live chat: a volunteer handover in the existing assistant widget, a mobile volunteer console at `/volunteer-chat`, and an admin roster/QR page at `/manage/live-chat`, all over Supabase Realtime.

**Changes**
- UI: live chat panel + online indicator in the assistant widget; volunteer mobile console; staff roster page with QR; four locale files.
- Backend: live-chat server logic, public visitor endpoints (rate-limited), volunteer/admin server functions, cron purge route.
- Config: CMS nav entry; cron schedule for the 30-day purge.

**Backend / schema changes** — Four new tables (`live_chat_shifts`, `live_chat_presence`, `live_chat_conversations`, `live_chat_messages`) with RLS, grants and an online-count function. No anon grants on the tables. No changes to existing tables.

**Testing & verification** — Volunteer online/offline and heartbeat expiry; visitor start with nobody online and with one online; two volunteers racing to accept; reload on both sides; 2-minute no-answer timeout; end chat; last-3-transcripts card; roster CRUD and QR link; admin-only access; purge job on aged rows; all four languages; mobile layout.

**Risks & rollback** — New tables and files only; removing the handover button and the nav entry disables the feature without touching the AI assistant. Realtime subscriptions add a persistent connection only while the panel or console is open.

**Follow-ups / known debt** — No canned replies, file attachments, typing indicators, or transfer between volunteers; no push notifications (the console must stay open); roster does not gate availability.
