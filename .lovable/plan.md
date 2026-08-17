# Staying "online" on iOS when the app is in the background

## The honest constraint

iOS gives a home-screen web app no background execution at all. When the volunteer
switches apps or locks the phone, the page is frozen within seconds: no timers, no
network, no realtime socket. There is no "background app refresh" toggle a website can
use — that setting only applies to native apps. So the current 30-second heartbeat stops
the moment the app leaves the screen, and after 90 seconds the volunteer counts as gone.

Anything that keeps a volunteer reachable on iOS therefore has to come from either
(a) the server deciding how long "online" lasts, or (b) Web Push waking the volunteer up.
Both already have foundations in the project (presence table, push subscriptions, VAPID
keys, `push-sw.js`).

## What to change

### 1. Duty window instead of a live heartbeat

Going online starts a **duty window** — the volunteer is considered on duty until it ends,
regardless of whether the phone screen is on.

- Volunteer taps "Go online" and picks a duration (default 2 hours, options 1h / 2h / 4h).
- Presence stores an `on_duty_until` timestamp; the public "is anyone on duty?" count uses
  it instead of the 90-second heartbeat.
- The heartbeat keeps running while the app is visible, but only refreshes the window; it
  no longer decides availability on its own.
- The header shows the remaining time and a one-tap "extend" action; reopening the app
  extends it automatically.
- Going offline, or the window expiring, drops the volunteer. A safety rule: if a waiting
  visitor gets no answer within a couple of minutes, that volunteer's window ends so the
  widget stops promising a human.

### 2. Push as the actual wake-up

The duty window only works if the volunteer learns about a visitor while the app is
closed — that is exactly what Web Push does, and it already exists.

- Make notification opt-in part of going online rather than a separate button, with a
  clear line that on iOS it needs the home-screen app.
- Notifications become time-sensitive style: visitor first name, waiting since, and a tap
  target that opens straight into that conversation.
- Re-notify once after ~60 seconds if nobody has accepted.
- If a volunteer has no working push subscription, going online warns them that they will
  only see visitors while the app is open.

### 3. Keep the screen alive during an active chat

While a conversation is open and the app is in the foreground, request a screen wake lock
so the phone does not lock mid-conversation and freeze the thread. Released when the chat
ends or the app is hidden.

### 4. Fast catch-up on resume

On resume the app already refreshes the session; add a presence + list refresh in the same
step so the volunteer sees the current queue immediately instead of a stale one.

## What cannot be done

- No background polling, no periodic sync on iOS (Periodic Background Sync is Chromium-only).
- No sound or vibration from a closed web app other than a push notification.
- Push on iOS requires the app added to the home screen and notifications allowed; in plain
  Safari there is no way to reach a volunteer whose app is closed.

## Technical notes

- `live_chat_presence`: add `on_duty_until timestamptz`; `live_chat_online_count()` and the
  volunteer list switch from `last_seen_at > now() - 90s` to `on_duty_until > now()`.
  Keep `last_seen_at` for the "active right now" indicator in the roster.
- Duty window is written through a server function so the client cannot set an arbitrary
  length; extension on resume goes through the same call.
- `src/routes/_member/volunteer-chat.tsx`: heartbeat effect refreshes the window while
  visible; header gains remaining-time + extend; wake lock via `navigator.wakeLock` behind
  a capability check.
- `live-chat-push.server.ts`: richer payload (conversation id, visitor first name), a
  single re-notify pass, and skipping volunteers whose window has expired.
- `public/push-sw.js`: `notificationclick` deep-links to the conversation.
- Copy in `live-chat.json` (EN/DE/FR/IT) for duration picker, remaining time, push warning.

## PR note

**Summary** — iOS freezes an installed web app in the background, so heartbeat-based
presence drops volunteers as soon as they leave the screen. Replace it with a server-held
duty window plus push wake-ups, so a volunteer stays reachable with the phone in a pocket.

**Changes**
- UI: go-online duration picker, remaining-time and extend control, push warning, wake lock
  during an active chat, queue refresh on resume.
- Backend: `on_duty_until` on presence, online-count and roster switched to it, duty window
  set/extended through a server function, push payload and re-notify pass.
- i18n: new keys in EN/DE/FR/IT.

**Backend / schema changes** — One new column on `live_chat_presence` and an updated
`live_chat_online_count()`; no new tables, grants unchanged.

**Testing & verification** — Installed app on iPhone: go online, lock the phone, confirm the
widget still offers a human and that a new visitor produces a notification that opens the
right chat; window expiry drops availability; unanswered-visitor safety rule verified; plain
Safari (no push) shows the warning; desktop browser unaffected.

**Risks & rollback** — Main risk is promising a human who never answers; mitigated by the
unanswered-visitor rule and a bounded window. Revert restores the heartbeat rule; the extra
column is harmless if left.

**Follow-ups / known debt** — No background execution is possible on iOS; a native wrapper
would be the only way to get true background presence.
