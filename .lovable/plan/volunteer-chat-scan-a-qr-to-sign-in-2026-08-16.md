# Volunteer chat: scan a QR to sign in

## The problem

When a volunteer adds the volunteer chat to the iOS home screen, the installed app gets its own
storage container. The session created in Safari does not travel with it, so the first launch of
the home-screen app lands on the sign-in page instead of the console. Today the only fast sign-in
path is scanning a QR code *with the phone camera app*, which opens Safari again — the wrong
container. There is no way to scan from inside the installed app.

## What changes

1. **A "Scan QR" sign-in screen** at `/volunteer-login` (public, no token in the URL).
   - Opens the phone camera in-page, reads the QR code shown on the member page of a
     laptop/second device, and signs the volunteer straight into the console.
   - Camera permission is asked only after the volunteer taps "Scan QR code".
   - Fallback for blocked or unavailable cameras: paste/type the code manually.
   - Neutral error copy for used, expired or unknown codes, plus a "Scan again" action.
   - Also offers "Sign in with email and password" as a link to the normal sign-in page.

2. **The installed app lands there instead of the login page.** When an unauthenticated visitor
   opens `/volunteer-chat`, the Member Area gate sends them to `/volunteer-login` (carrying the
   intended destination) rather than the generic member sign-in. Every other member route keeps
   its current behaviour.

3. **The member-page tile explains the new flow.** The QR hint becomes: open the app on your
   phone, tap "Scan QR code", point it at this code. The existing 10-minute countdown, "Show new
   code" button and desktop link stay as they are.

4. **After signing in, the session sticks.** Because the scan now happens inside the installed
   app, the Supabase session is stored in the app's own container — the volunteer scans once per
   install, not once per launch.

Nothing about the existing token security changes: single use, 10 minutes, hash-only storage,
volunteers only, rate limited, neutral responses. The existing `/volunteer-login/$token` deep link
keeps working for anyone who scans with the system camera.

## Technical notes

- New route `src/routes/volunteer-login.index.tsx` (`ssr: false`, `noindex`). Camera via
  `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`, frames drawn to
  a canvas and decoded with `jsqr` (already a dependency) on `requestAnimationFrame`. Stream
  stopped on unmount and after a successful decode.
- Decoded value is accepted either as a full `…/volunteer-login/<token>` URL or a bare token; the
  token is passed to the existing `redeemVolunteerLoginCode` server function, then
  `supabase.auth.verifyOtp({ type: "magiclink", token_hash })`, then navigate to
  `/volunteer-chat`. Shared redeem/verify helper extracted so the token route and the scanner
  route use one code path.
- `src/routes/_member/route.tsx`: when there is no user and the requested path is
  `/volunteer-chat`, redirect to `/volunteer-login` instead of `/auth`.
- Copy added under `live-chat.volunteer.*` and `member.home.liveChat.*` in EN, DE, FR and IT.
- No database, RLS, or server-function signature changes.

## PR note

**Summary** — Volunteers who install the chat on their iOS home screen currently arrive signed
out. Add an in-app QR scanner sign-in screen and route the installed app to it.

**Changes**
- UI: new `/volunteer-login` scanner screen (camera + manual code fallback + error/retry states).
- UI: member-area volunteer tile copy updated to describe scanning from inside the app.
- Routing: unauthenticated `/volunteer-chat` redirects to `/volunteer-login`.
- i18n: new keys in `live-chat.json` and member home strings for EN/DE/FR/IT.

**Backend / schema changes** — None.

**Testing & verification** — Scan flow on a phone against a code shown on desktop; expired and
reused codes; camera-denied fallback; desktop browser without a camera; standalone (home-screen)
launch signed out and signed in; non-volunteer account still sees the "not activated" message.

**Risks & rollback** — Contained to the volunteer routes; no data model change. Revert the route
files and i18n keys to roll back; the existing token deep link is untouched.

**Follow-ups / known debt** — iOS still requires the code to be shown on a second screen; a
push-based or emailed one-tap link could remove that step later.
