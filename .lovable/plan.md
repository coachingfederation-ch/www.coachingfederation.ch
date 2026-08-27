# Fix premature sign-out in the installed volunteer app

## Task 1 — Refresh Token TTL: not changeable from here

I checked the auth settings the Lovable Cloud integration exposes. The available
knobs are signup/anonymous toggles, email auto-confirm, password HIBP checks,
current-password requirement, and the auth email rate limit. **Refresh Token TTL
(rotation period) is not among them**, and there is no other tool here that
writes it.

So: please set it yourself under Authentication → Sessions/URL Configuration →
Refresh Token TTL = `604800` (7 days), leaving "Detect and refresh expired
tokens" and the reuse interval at their defaults. Everything below still helps,
but a volunteer sleeping for days only survives once that TTL is raised.

## Task 2 — Harden `src/lib/session-keepalive.ts`

Three changes inside `useSessionKeepAlive`, no other file touched:

1. **Refresh once on mount.** Run the same routine immediately when the hook
   mounts (cold launch / resume from suspension), instead of waiting for a
   `visibilitychange` or `online` event that may never fire on a cold start.
   The 60s minimum interval between attempts stays.

2. **Bypass the throttle when the token is (nearly) expired.** The refresh
   routine gains a `force` path: it first reads the stored session, and if
   `session.expires_at` is in the past or within the next 60 seconds, it
   refreshes regardless of when the last attempt ran. Ordinary visibility flips
   with a healthy token keep the existing 60s throttle. Order changes slightly —
   read the session first, then decide about throttling — so an expiring token
   is always renewed before any query runs.

3. **Distinguish a real sign-out from an offline blip.** Inspect the error
   returned by `refreshSession()`: when it identifies a missing/expired/already-
   used refresh token (Supabase `refresh_token_not_found`,
   `refresh_token_already_used`, or an HTTP 400/401 from the auth endpoint), stop
   retrying for that session and let the existing gate in `_member/route.tsx`
   do its thing on the next navigation — no redirect is triggered from here.
   Network/fetch failures stay silently ignored exactly as today.

### Technical notes

- `refreshSession()` returns `{ error }` rather than throwing for auth errors;
  the classifier reads `error.code` / `error.status`, defaulting to "treat as
  network" when neither is conclusive, so an unknown failure never signs anyone out.
- No changes to `persistSession` / `autoRefreshToken`, no change to the
  20-minute proactive timer, no change to the auth gate, no UI change.

## PR note

**Summary** — Volunteers in the installed iOS app were signed out after a few
hours because WKWebView suspends JS timers, so supabase-js never refreshed and
the refresh token expired. Keep-alive now refreshes at launch and pre-emptively
when the token is about to expire; the project's refresh-token TTL must be
raised separately in the backend settings.

**Changes** — UI: none. Frontend: `src/lib/session-keepalive.ts` only (mount
refresh, expiry-aware throttle bypass, auth-vs-network error classification).

**Backend / schema changes** — None in code. One manual setting: Refresh Token
TTL → 604800s.

**Testing & verification** — Volunteer console loads with a valid session;
simulated expired `expires_at` triggers an immediate refresh on visibility
return; offline refresh failure leaves the session intact; a revoked refresh
token falls through to the existing sign-in gate.

**Risks & rollback** — Small blast radius, one file, revert restores current
behavior. The TTL setting is independent and safe to leave in place.

**Follow-ups / known debt** — Without the TTL change the fix only covers
suspensions shorter than the current (likely 1-hour) refresh-token lifetime.
