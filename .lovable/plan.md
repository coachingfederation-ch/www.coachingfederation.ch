# Volunteer chat: why the installed app signs you out, and how to fix it

## What the current behaviour actually is

There is no timeout written into the app. Sessions are stored in the browser's local storage of
the installed app, kept alive automatically, and there is no idle logout anywhere in the code.
What does exist are three ways the app *appears* to sign you out:

1. **The gate asks the server "who is this?" on every launch.** Opening the console calls the
   auth server before rendering. If that call fails for any reason — no signal, flaky mobile
   network, cold launch before the phone reconnects — the gate treats it exactly like "not signed
   in" and sends the volunteer to the QR scan screen, even though the session is still valid.
2. **Background refresh does not run while the app is closed.** The short-lived access token lasts
   about an hour; the long-lived refresh token renews it. When the app has been suspended for days
   the renewal happens at the moment of launch, so a bad network at that exact moment produces
   case 1.
3. **iOS storage eviction.** Safari-based storage for a home-screen app can be cleared after a
   long period without use. That genuinely does end the session and a new scan is required.

Nothing in the QR flow is at fault: the QR code itself expires after 10 minutes and is single use,
but the session it creates is a normal long-lived session.

## What to change

**1. Do not sign out on a network failure.**
The Member Area gate should distinguish "no session stored" from "cannot reach the server right
now". Only the first redirects to the scan screen. A network/transient failure keeps the locally
stored session and lets the console load, with a small "reconnecting" state.

**2. Refresh the session when the app comes back to the foreground.**
Add a listener that, on app resume, refreshes the session once. This is what keeps a
once-a-week volunteer signed in.

**3. A clear "session expired" screen instead of a silent bounce.**
When the session really is gone, the scan screen should say so in one line ("Your sign-in expired,
scan a new code") rather than looking like a random redirect.

**4. Explain the iOS limitation to the volunteer.**
One short line in the member-area tile: opening the app at least every few weeks keeps you signed
in; otherwise scan a fresh code. Also note that keeping the app installed and opening it
occasionally is what prevents the sign-out.

Optional, only if wanted: extend refresh-token lifetime / keep the console page alive during a
shift so presence and session both stay warm.

## Technical notes

- `src/routes/_member/route.tsx`: replace the single `supabase.auth.getUser()` check with
  `getSession()` first (local, no network); only when there is no stored session redirect to
  `/volunteer-login` (with a `reason=expired` search param) or `/auth`. Keep the server check as a
  non-blocking validation so a real revocation still logs out on the next successful call.
- New small hook (e.g. `src/lib/session-keepalive.ts`) used by the member shell: on
  `visibilitychange` → visible and on `online`, call `supabase.auth.refreshSession()` once,
  debounced; ignore failures.
- `src/routes/volunteer-login.index.tsx`: render the expired notice when the search param is set.
- Copy in `live-chat.json` and the member tile strings, EN/DE/FR/IT.
- No database, RLS, or server-function changes.

## PR note

**Summary** — Installed volunteer app appeared to log volunteers out. Cause is a launch-time auth
check that treats network failure as "signed out", plus no refresh on app resume. Make the gate
resilient, refresh on resume, and explain the real iOS storage limit.

**Changes**
- Routing: member gate uses the locally stored session first; transient failures no longer bounce.
- Client: session refresh on foreground/online.
- UI: "sign-in expired" notice on the scan screen; short retention hint in the member tile.
- i18n: new keys in EN/DE/FR/IT.

**Backend / schema changes** — None.

**Testing & verification** — Launch installed app in airplane mode (stays in console, shows
reconnecting), after several days idle, after an explicit sign-out (scan screen with expired
notice), and revoked account (still logged out). Desktop browser and Safari unaffected.

**Risks & rollback** — Small blast radius, member routes only; revert the two route files and the
hook. Slight trade-off: a revoked session may survive until the next successful server check.

**Follow-ups / known debt** — iOS storage eviction after long inactivity cannot be avoided from
the web; a longer refresh-token window can reduce, not remove, it.
