# Volunteer chat

Live, human chat between a website visitor and a chapter volunteer. The AI
assistant answers first; when at least one volunteer is on duty the visitor can
ask for a person instead. Volunteers work from a phone console, admins activate
and remove volunteers from the CMS.

Three surfaces:

| Surface           | Route               | Who                              |
| ----------------- | ------------------- | -------------------------------- |
| Visitor widget    | site-wide launcher  | Anonymous public visitors        |
| Volunteer console | `/volunteer-chat`   | Signed-in, activated volunteers  |
| Volunteer admin   | `/manage/live-chat` | Platform admins / administrators |

## Data model

All tables are `live_chat_*`, all with RLS and explicit grants. **No table
grants anything to `anon`** — the visitor is anonymous and reaches the data only
through the server.

| Table                          | Holds                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `live_chat_volunteers`         | Activated members (`user_id`, display name, who activated them).             |
| `live_chat_presence`           | One row per volunteer: `is_online`, `last_seen_at` heartbeat.                |
| `live_chat_conversations`      | Visitor name, optional email, locale, page path, `visitor_key_hash`, status. |
| `live_chat_messages`           | `sender` (`visitor` / `volunteer` / `system`), body, timestamp.              |
| `live_chat_login_tokens`       | Hashed, single-use, 10-minute QR sign-in codes.                              |
| `live_chat_push_subscriptions` | Web Push endpoints per volunteer.                                            |

`public.live_chat_online_count()` is a security-definer function so "is anyone
on duty?" can be answered without exposing presence rows. Presence itself is
readable only by volunteers and staff.

## Visitor side

`src/components/assistant/AssistantWidget.tsx` polls the online count and shows
the "Talk to a volunteer" handover only when someone is on duty;
`LiveChatPanel.tsx` renders the human thread with the same AI Elements
primitives as the AI thread.

Everything goes through the single public endpoint
`src/routes/api/public/live-chat.ts` with an `action` body field:

- `status` — online count, the only unauthenticated read.
- `start` — creates the conversation and returns an **opaque visitor key**.
- `poll`, `send`, `end` — require that key.

The key is the whole authorisation model. Only its SHA-256 hash is stored
(`src/lib/live-chat.server.ts`), so a database reader cannot replay it, and the
browser keeps it in `localStorage` so a reload rejoins the same thread. `start`
and `send` are rate-limited per IP through `checkRateLimit`.

## Volunteer console

`src/routes/_member/volunteer-chat.tsx` — mobile-first, inside the member area.

- Start flow: confirm the display name, then go online.
- Presence is a **heartbeat row** (30 s ping, 90 s timeout — `PRESENCE_TIMEOUT_SECONDS`),
  not an ephemeral channel, so the public widget can read availability
  server-side. Closing the page lets the row expire.
- The header shows "Online now N"; tapping it lists the other volunteers.
  Going offline returns to the start flow.
- Main screen: waiting visitors first, then this volunteer's recent chats.
  First acceptance wins; the request disappears for everyone else.
- Live updates come from Supabase Realtime `postgres_changes` on the
  conversation and message tables (the volunteer is authenticated, so RLS
  applies).
- Ending a chat shows a short "chat was ended" confirmation before returning to
  the waiting list.

Layout uses `100dvh` with a fixed header, scrolling middle and a pinned
composer, plus `env(safe-area-inset-*)` padding, so the send button stays
visible on iOS with the keyboard open.

## Installable app and QR sign-in

`public/manifest.webmanifest` makes the console installable to the iOS home
screen (standalone, Deep Blue theme, chapter mark icon). The installed app has
its own storage container, so a Safari session does not travel with it — hence
two sign-in paths, both backed by `live_chat_login_tokens`:

- **Deep link** `/volunteer-login/$token` — scanned with the system camera.
- **In-app scanner** `/volunteer-login` — camera via `getUserMedia`, decoded
  with `jsqr`, with manual code entry and email/password as fallbacks. An
  unauthenticated hit on `/volunteer-chat` is redirected here rather than to the
  generic member sign-in.

Codes are minted from the member-area tile (`LiveChatVolunteerTile.tsx`), live
for `TOKEN_TTL_MINUTES` (10), are single use, stored hashed, bound to the
volunteer's own account and revoked when the volunteer is deactivated.
`src/lib/volunteer-qr-signin.ts` is the shared redeem-and-verify helper used by
both entry points. Responses stay outcome-neutral: a code is simply "no longer
valid".

There is no idle timeout. The member gate (`src/routes/_member/route.tsx`)
trusts the locally stored session first, so a cold launch without network no
longer looks like a sign-out, and `useSessionKeepAlive`
(`src/lib/session-keepalive.ts`) refreshes the token whenever the app returns to
the foreground. What can still end a session is iOS clearing the installed
app's storage after a long period without use — then `/volunteer-login` shows
"your sign-in expired" and a fresh scan is needed.

## Alerts

While the console is open: a chime and a waiting counter
(`src/lib/volunteer-notifications.ts`). When it is closed: Web Push
(`live-chat-push.server.ts`, VAPID keys as backend secrets, service worker
`public/push-sw.js`), fanned out when a conversation enters `waiting`.
Volunteers opt in explicitly; on iOS push requires the home-screen app.

## Admin

`/manage/live-chat` lists activated volunteers with their last active
conversation ("today", "2 days ago", …) and a remove action. The member picker
offers only claimed accounts with an active credential
(`live-chat-volunteers.server.ts`). Members can also opt out themselves from the
member-area tile.

## Retention

Transcripts are deleted 30 days after a conversation ends
(`TRANSCRIPT_RETENTION_DAYS`). pg_cron POSTs to
`/api/public/live-chat-purge`, authorised with the shared server-only cron
token — the same pattern as the other scheduled endpoints — which runs
`purgeOldConversations()`.

Visitors give a first name and an optional email only, and the composer states
that the conversation is handled by a chapter volunteer and kept for 30 days.

## Module map

| Module                                      | Responsibility                                         |
| ------------------------------------------- | ------------------------------------------------------ |
| `live-chat.server.ts`                       | Visitor side: key hashing, start/send/read/end, purge. |
| `live-chat-volunteers.server/.functions.ts` | Activation, eligibility, opt-out, volunteer status.    |
| `volunteer-qr.server/.functions.ts`         | Mint and redeem QR sign-in tokens.                     |
| `volunteer-qr-signin.ts`                    | Client-side redeem + `verifyOtp` helper.               |
| `live-chat-push.server/.functions.ts`       | Push subscriptions and waiting-visitor fan-out.        |
| `volunteer-notifications.ts`                | In-console chime and permission handling.              |

Copy lives in `src/i18n/locales/{en,de,fr,it}/live-chat.json`; CMS labels in
`cms.json`.
