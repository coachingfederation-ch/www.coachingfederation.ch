# Volunteer console: staying signed in for 7 days

## What I checked

I queried the auth store directly before writing this:

- No session time-box is configured — every `auth.sessions` row has `not_after = NULL`,
  and sessions from as far back as three weeks ago are still present.
- Refresh tokens are not expiring either; the rows that are revoked are the normal
  result of rotation (a new token replacing the previous one).

So there is **no 24-hour server-side expiry** to raise. The access token itself is
short-lived (one hour) by design and is meant to be renewed silently from the
refresh token, so the sign-out is happening on the device, not in the backend.

## What is most likely happening (unconfirmed)

Two candidates fit "works, then gone the next day". Both end with the stored
session disappearing from the phone, which is exactly what the Member Area gate
reads before it redirects to the QR screen.

1. **Refresh-token rotation across two devices.** If the same volunteer account is
   also open on a desktop (or a second phone), each renewal invalidates the other
   device's stored token. The next launch of the phone app gets "invalid refresh
   token", and the client library then clears the session.
2. **Browser storage eviction in the installed app.** iOS clears script-writable
   storage for sites with no recent interaction, and the installed app has its own
   storage container.

The current keep-alive only fires when the app becomes visible or the phone comes
back online, so neither case leaves a trace we can inspect today.

## Plan

### Step 1 — Confirm the cause before changing behaviour

Record a small, local sign-out audit in the console: on every launch, note whether
a stored session was found, whether refresh succeeded, and the exact failure
reason, and show that on a hidden diagnostics line in the volunteer console (and
in the redirect to the QR screen). One day of real use tells us which of the two
causes it is instead of us guessing.

### Step 2 — Make the phone survive a lost session (the actual "7 days")

Give the installed app a **device trust token** valid for 7 days, written when a
volunteer signs in by QR:

- Stored on the device, hashed in the database (same pattern the existing QR
  sign-in code already uses — opaque token, only the hash stored, bound to the
  volunteer, revoked on opt-out).
- When the console launches and finds no Supabase session, it silently redeems the
  device token for a fresh session instead of showing "your sign-in expired".
- Rolling: each successful redemption extends the window another 7 days, so a
  volunteer who opens the app at least once a week never sees the QR screen again.
- The QR screen stays as the fallback for a device that has no valid token.

### Step 3 — Stop the two devices fighting

Renew proactively on a timer while the console is open, not only on resume, and
treat a rotation conflict as "re-establish the session" (Step 2) rather than a
sign-out.

### Step 4 — Verify

Sign in by QR on a phone, keep a desktop session open on the same account, then
re-open the phone app after >24 hours and confirm it lands in the console with no
scan. Confirm opting out of volunteering invalidates the device token immediately,
and that a token older than 7 days falls back to the QR screen.

## Technical notes

- New table `live_chat_device_tokens` (user_id, token_hash, expires_at, last_used_at,
  revoked_at) with GRANTs and RLS; all access through the existing server-side
  admin path, never from the browser.
- Redemption reuses the existing magic-link `token_hash` handover in
  `src/lib/volunteer-qr.server.ts`, so no password or long-lived credential is
  ever held by the device.
- Gate change is confined to `src/routes/_member/route.tsx` (attempt device
  re-auth before redirecting) and `src/lib/session-keepalive.ts` (timer + failure
  classification).

## PR note

**Summary** — Volunteer console sign-outs are not a backend expiry; add a 7-day,
rolling, revocable device trust token so the installed phone app re-establishes its
session silently, plus diagnostics to confirm the root cause.

**Changes** — Member gate re-auth path; keep-alive timer and failure classification;
new device-token server module; volunteer opt-out revokes tokens; i18n strings for
the new fallback states.

**Backend / schema** — One new table with RLS and GRANTs; no changes to auth
configuration.

**Testing & verification** — QR sign-in on a phone alongside a desktop session,
re-open after 24h and after 8 days; opt-out revocation; non-volunteer refusal.

**Risks & rollback** — A long-lived device credential is the main risk; mitigated by
hashing, 7-day expiry, single-purpose binding to an active volunteer, and immediate
revocation on opt-out. Reverting the code leaves the table unused and harmless.

**Follow-ups** — If Step 1 shows storage eviction rather than token rotation, the
device token still fixes the symptom, but we should additionally document the
"open the app weekly" expectation for volunteers.
