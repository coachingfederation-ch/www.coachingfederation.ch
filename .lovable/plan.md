# Volunteer chat: mobile fit, home-screen app, QR sign-in, push alerts

Four changes to the volunteer console, all scoped to the volunteer surfaces. Public site, palette, fonts and CMS stay as they are.

## 1. Mobile layout that fits the phone

The console currently uses `min-h-screen`, so on iOS the browser toolbars eat the bottom of the page and the reply field plus send button drop below the fold.

- Switch the console shells to dynamic viewport height (`100dvh`) with a three-part frame: fixed header, scrolling middle, composer pinned to the bottom.
- Respect the iPhone home indicator and notch with safe-area padding on header and composer.
- Keep every tap target at 44px, shrink the header when a chat is open so more of the conversation is visible, and keep the message list auto-scrolled to the newest message when the keyboard opens.
- Same treatment for the start flow, the waiting list and the transcript list, so no screen can push its primary action out of view.

## 2. Installable volunteer app

Home-screen support only, no offline caching.

- A web app manifest whose start page is the volunteer console, standalone display, Deep Blue theme, ICF chapter mark as the app icon.
- Head tags for manifest, theme colour and Apple touch icon.
- The member tile gets a short "Add to home screen" hint next to the QR code.

## 3. QR opens the console already signed in

The QR code in the member tile becomes a one-time sign-in link for that volunteer.

- Tapping "Show QR" mints a token valid ~10 minutes, single use, bound to the volunteer's own account. The QR encodes a link carrying it.
- Scanning opens a landing route that redeems the token, establishes the session on the phone and lands on the console. The token is consumed on first use; a used, expired or unknown token shows a neutral "This code is no longer valid — open the member area and show a new one" message.
- Only stored hashed, never logged, never reusable, and it is invalidated when the volunteer opts out or is deactivated. The code can be re-generated any time from the member tile.
- Once redeemed the phone keeps a normal session, so day-to-day the app icon opens straight into the console.

## 4. Alerts when a visitor is waiting

- While the console is open: a short chime and a visible waiting counter in the header.
- When the app is closed: web push. On iPhone this only works when the app has been added to the home screen, which is what part 2 delivers — the console shows a one-line notice explaining that.
- Volunteers turn notifications on with an explicit button in the console; the browser permission prompt only appears after that tap. Turning it off removes the subscription.
- A notification is sent to activated volunteers who enabled it when a new visitor enters the waiting queue; tapping it opens the waiting list.

## Technical notes

- Layout: `dvh` units, `env(safe-area-inset-*)`, sticky composer. No component library change.
- Manifest at `public/manifest.webmanifest` plus icons; head tags in `src/routes/__root.tsx`. No service worker for installability.
- QR sign-in: new table `live_chat_login_tokens` (user_id, token_hash, expires_at, used_at) with RLS closed to clients; mint and redeem through server functions. Redemption verifies the token server-side, then issues a one-time sign-in for that account and redirects to `/volunteer-chat`. Rate-limited through `checkRateLimit`, redemption responses outcome-neutral.
- Push: standard Web Push with VAPID keys stored as backend secrets, a `live_chat_push_subscriptions` table, and a dedicated messaging service worker (`public/push-sw.js`) that is separate from any app cache. Fan-out runs server-side when a conversation row is created with status `waiting`. The sender must be Cloudflare-Workers compatible; a Workers-safe web-push library will be used rather than the Node-only one.

## PR note

**Summary** — Makes the volunteer chat console usable on a phone, installable to the iOS home screen, reachable from the QR code without a second login, and able to alert volunteers when someone is waiting.

**Changes**
- UI: viewport-safe console layout (header / scroll / pinned composer), safe-area padding, waiting counter, notification opt-in button, QR + install hint in the member tile.
- Backend: `live_chat_login_tokens` and `live_chat_push_subscriptions` tables with RLS and grants; server functions to mint/redeem QR tokens, store/remove push subscriptions and fan out notifications.
- Config: web app manifest, app icons, head tags, messaging service worker, VAPID secrets.

**Backend / schema changes** — Two new tables (RLS on, no client read of token hashes), one new secret pair for push. No changes to existing chat tables.

**Testing & verification** — Console checked at iPhone-sized viewport in portrait with the keyboard open; QR redemption tested for fresh, reused and expired tokens; push verified on an installed home-screen app and confirmed as unavailable in plain iOS Safari; existing accept/send/end flows re-checked for regressions.

**Risks & rollback** — QR sign-in is the sensitive part; it is short-lived, single-use, hashed and revocable, and can be disabled by dropping the mint call without touching normal login. Push is additive and degrades to the in-app chime. Tables are safe to leave if code is reverted.

**Follow-ups / known debt** — No offline support. Android/desktop push works without install; iOS requires the home-screen app. Notification wording ships in DE/FR/IT/EN.
