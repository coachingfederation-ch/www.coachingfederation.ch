# Plan: Remove web push alerts from the volunteer chat console

## Context

The volunteer live-chat console (`src/routes/_member/volunteer-chat.tsx`) still shows two web-push-era UI elements that are now superseded by the native iOS app:

1. **"Keep this page open to receive chats"** — a hint line at the bottom of the online view.
2. **"Alerts when someone is waiting"** — the `NotificationRow` component, a VAPID web-push opt-in panel that appears both in the offline start flow and the online console.

With native APNs push handling notifications, the in-browser web-push opt-in is redundant. The request is to remove these two pieces from the console.

## Scope

Remove the two UI elements and the client-side web-push code that only existed to serve them. Keep the in-browser chime (it plays while the console tab is open — still useful). Leave the server-side VAPID fan-out (`live-chat-push.server.ts`, `live-chat-push.functions.ts`, `push-sw.js`, the `notifyWaitingVisitor` call in `live-chat.server.ts`) untouched for now — it becomes a harmless no-op with no new subscriptions and is noted as follow-up debt.

## Changes

### 1. `src/routes/_member/volunteer-chat.tsx`

- Delete the `keepOpen` hint line (the `<p>` at the bottom of the online view).
- Remove both `<NotificationRow />` usages (offline start flow + online view).
- Delete the `NotificationRow` component definition (lines ~684–742).
- Remove now-dead state and handlers that only served `NotificationRow`:
  - `pushState`, `pushBusy` state
  - the push-state init `useEffect`
  - the `togglePush` `useCallback`
- Clean up imports: drop `Bell`, `BellOff` from lucide-react; drop `currentPushState`, `disablePush`, `enablePush`, `isStandalone`, `pushSupported` from `@/lib/volunteer-notifications`.
- Keep: `playWaitingChime`, the chime `useEffect`, `waitingCountRef`, the APNs/iOS bridge code.

### 2. `src/lib/volunteer-notifications.ts`

- Remove the five web-push functions (`pushSupported`, `isStandalone`, `currentPushState`, `enablePush`, `disablePush`) and their helpers (`toBase64Url`, `decodeKey`, `existingSubscription`).
- Remove the import of `getPushConfig`, `removePushSubscription`, `savePushSubscription` from `./live-chat-push.functions`.
- Remove the `SW_URL` constant.
- Keep `playWaitingChime` only; update the module doc comment.

### 3. i18n locale files (`de`, `en`, `fr`, `it` — `live-chat.json`)

- Remove keys: `keepOpen`, `alertsTitle`, `alertsBody`, `alertsOn`, `alertsOff`, `alertsBlocked`, `alertsInstallFirst`, `alertsInstallHint`.

## Out of scope (noted as follow-up debt)

The server-side VAPID web-push stack is now unreached from the UI and will silently no-op as existing subscriptions go stale:

- `src/lib/live-chat-push.functions.ts` (server functions `getPushConfig`, `savePushSubscription`, `removePushSubscription` — no remaining callers).
- `src/lib/live-chat-push.server.ts` (`vapidPublicKey`, `saveSubscription`, `removeSubscription`, `notifyWaitingVisitor`).
- The `notifyWaitingVisitor` fan-out call in `src/lib/live-chat.server.ts`.
- `public/push-sw.js` service worker.
- `live_chat_push_subscriptions` table and its RLS policies.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` secrets.

These can be removed in a separate pass once confirmed safe. Leaving them is harmless (no new subscriptions; the fan-out finds nothing to send).

## PR note

- **Summary**: Removes the "Keep this page open" hint and the VAPID web-push "Alerts" panel from the volunteer chat console, now superseded by the native iOS APNs app. Cleans up the dead client-side push code; leaves the server-side VAPID stack as harmless no-op follow-up.
- **Changes**:
  - UI: `volunteer-chat.tsx` — removed hint line, `NotificationRow` component and both usages, dead push state/handlers/imports.
  - Client lib: `volunteer-notifications.ts` — removed push functions, kept `playWaitingChime`.
  - i18n: removed 8 push/alerts keys from all 4 locales.
- **Backend / Schema**: None.
- **Testing & Verification**: Build passes; console still loads, chime still plays on new arrivals, APNs iOS bridge unaffected, no TS unused-import errors.
- **Risks & Rollback**: Low — purely subtractive UI change. Revert restores the panels.
- **Follow-ups / Known Debt**: Server-side VAPID stack (`live-chat-push.*`, `push-sw.js`, table, secrets) is now unreached from the UI and can be removed in a follow-up pass.
