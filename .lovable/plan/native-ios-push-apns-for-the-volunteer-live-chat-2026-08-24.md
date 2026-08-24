# Native iOS push (APNs) for the volunteer live chat

Adds a second, parallel notification channel so volunteers with the iOS app get a native alert the moment a visitor is waiting. Web push, the visitor flow and the volunteer console UX stay exactly as they are.

## One deviation from the request, and why

The request asks for the APNs fan-out to live in a Supabase edge function (`apns-send`). This project has no edge functions at all — the backend runs entirely on the app's own server runtime, and the platform rule for this stack is that new backend logic goes there rather than into a new edge function. The APNs call is a plain HTTPS request with an ES256 token built from Web Crypto, which the app's server runtime supports natively.

So the fan-out goes into `src/lib/live-chat-apns.server.ts` directly instead of `supabase.functions.invoke("apns-send")`. Everything else — table, columns, RLS, payload shape, headers, token deletion on 400/410, secrets, console wiring — follows the request. The public behaviour is identical; only the place the code runs changes. If you'd rather have the edge function anyway, say so and I'll switch that one piece back.

## What gets built

**1. Device token table** — `live_chat_apns_subscriptions`: `user_id` (references auth.users, cascade delete), `device_token` (hex), `platform` default `'ios'`, `created_at`. Primary key `(user_id, device_token)`. RLS on, nothing granted to anon or authenticated, full access to the service role — matching the existing web-push table exactly.

**2. APNs module** (`src/lib/live-chat-apns.server.ts`)
- `saveApnsSubscription(userId, token)` — upsert on `(user_id, device_token)`.
- `removeApnsSubscription(userId, token)` — delete the row.
- `notifyWaitingVisitorApns(visitorName)` — read all tokens, sign a short-lived ES256 provider token (`{ iss: APNS_TEAM_ID, iat }`, header `{ alg: "ES256", kid: APNS_KEY_ID }`) from the PEM in `APNS_KEY`, then POST to `api.push.apple.com/3/device/<token>` per device with `authorization: Bearer …`, `apns-topic`, `apns-priority: 10`, `apns-push-type: alert`. Payload is the requested `aps` alert plus `"action": "openWaitingChat"`. Responses 400 and 410 delete the row; successes are counted. Errors are swallowed and the provider token is cached in memory for its lifetime. The key is never logged.

**3. Server functions** (`src/lib/live-chat-volunteers.functions.ts`) — `registerApnsDeviceToken` and `unregisterApnsDeviceToken`, both auth-gated, both resolving the user server-side and validating the token shape.

**4. Trigger** — in `startConversation()` in `src/lib/live-chat.server.ts`, right after the existing `notifyWaitingVisitor(...)`, a best-effort `notifyWaitingVisitorApns(...)` inside the same try/catch. A push outage still never blocks a visitor from queueing.

**5. Console wiring** (`src/routes/_member/volunteer-chat.tsx`) — all of it feature-detected, so Safari and desktop behave exactly as today:
- After sign-in resolves, if `window.__icfPushToken` is a non-empty string, register it; re-check on window focus (and skip when the token hasn't changed).
- Post `{ type: "authState", token: <access_token> }` to `window.webkit.messageHandlers.nativeBridge` after sign-in so the wrapper can poll in the background; post `{ type: "authState", token: null }` and unregister the token when the session goes away.
- If `window.__icfPushPayload?.action === "openWaitingChat"` on load, call `loadLists()` so the waiting request is on screen immediately.

**6. Secrets** — `APNS_KEY` (PEM), `APNS_KEY_ID`, `APNS_TEAM_ID`, optional `APNS_TOPIC` (defaults to `ch.coachingfederation.icf.volunteers`). I'll request these through the secret prompt; they never enter the repo, docs or logs. Docs get placeholders only. Note: whoever holds the key must paste it into the secret dialog — I can't read it from anywhere else.

## PR note

**Summary** — Adds APNs push as a second notification channel for waiting live-chat visitors, alongside the existing VAPID web push, with device-token registration from the volunteer console via the iOS wrapper bridge.

**Changes**
- Backend: new `live-chat-apns.server.ts` (token storage + APNs fan-out with ES256 provider tokens); two new auth-gated server functions; APNs call added to `startConversation`.
- UI: `volunteer-chat.tsx` registers/unregisters the iOS device token, posts auth state to the native bridge, and refreshes the waiting list when opened from a push. No visible UX change.
- Schema: one migration creating `live_chat_apns_subscriptions` with RLS and grants.

**Backend / schema changes** — One new table, RLS enabled, service-role-only grants. No changes to existing tables, policies or functions.

**Testing & verification** — Table grants (anon/authenticated blocked, service role allowed); register and unregister a token as a signed-in volunteer; start a visitor conversation and confirm both web push and the APNs call fire; simulated 410 removes the token; APNs secrets missing → no-op, visitor still queues; console in desktop Safari with no bridge and no `__icfPushToken` behaves unchanged; deep-link payload refreshes the waiting list.

**Risks & rollback** — Additive only. Removing the `notifyWaitingVisitorApns` call disables the channel instantly; the table can be left in place. Worst case of a misconfigured key is silent non-delivery on iOS — web push is unaffected.

**Follow-ups / known debt** — No per-device opt-out UI (registration is implicit once the wrapper supplies a token); no badge-count reconciliation (badge is always 1); no Android/FCM channel; APNs fan-out is sequential-with-concurrency rather than a batched queue, fine at the current volunteer count.
