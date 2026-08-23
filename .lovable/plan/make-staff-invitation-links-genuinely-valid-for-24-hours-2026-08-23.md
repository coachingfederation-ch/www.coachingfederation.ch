# Make staff invitation links genuinely valid for 24 hours

## The problem

The invitation email promises "expires in 24 hours", but the link it carries is a backend
password-recovery link whose lifetime is set by the backend's one-time-code setting — the
default is one hour. That setting is not adjustable from here, so the honest fix is to stop
depending on it.

## The approach

Stop mailing the backend's recovery link directly. Instead mail a link carrying our own
invitation token, which we control and set to 24 hours. When the invitee clicks it, the
server checks the token is valid and unexpired, and only then mints a fresh recovery link —
seconds old, so the backend's own one-hour window is never a factor. The invitee never sees
a difference; the promise in the email becomes true.

This mirrors the token pattern already used for event waitlist invitations, so it is a
familiar shape in this codebase rather than a new paradigm.

## Steps

1. **Database** — add three columns to `internal_accounts`: the hashed invitation token,
   its expiry timestamp, and when it was used. Only the hash is stored, never the token.
2. **Invitation sending** — generate a random token, store its hash with a 24-hour expiry,
   and put the plain token in the emailed link. Keep the email copy at 24 hours; it is now
   accurate.
3. **Invitation landing page** — the page sends its token to the server, which validates it
   (exists, not expired, not already used, account not revoked) and returns a freshly minted
   one-time hash. The page then completes sign-in with that hash exactly as it does today
   and the invitee sets a password.
4. **Single use** — mark the token used when the password is set; a second click shows the
   existing "no longer valid" screen.
5. **Resend** — a resend issues a new token and invalidates the previous one, matching the
   current behaviour.
6. **Withdraw** — withdrawing an invitation clears the token, so the emailed link dies
   immediately.

## Technical notes

- New columns on `public.internal_accounts`: `invite_token_hash text`,
  `invite_expires_at timestamptz`, `invite_used_at timestamptz`. No new grants beyond the
  existing table grants; the exchange runs service-role only.
- `INVITE_TTL_HOURS` stays 24 and becomes the enforced value in
  `src/lib/internal-accounts.server.ts`.
- New server function `exchangeInternalInvite({ token })` — public (the caller has no
  session by definition), rate-limited through `checkRateLimit` in
  `src/lib/rate-limit.server.ts`, and outcome-neutral: any failure returns the same
  "invalid or expired" result, never revealing whether an address is invited.
- `/staff-invite` changes its search param from `token_hash` to `token` and calls the
  exchange before `supabase.auth.verifyOtp`. Links already in flight with the old param
  stop working; a resend fixes those.
- Backend auth settings are left untouched.

## PR note

- **Summary** — staff invitation links now really last 24 hours, by moving expiry control
  out of the backend's one-time-code setting and into an app-owned invitation token.
- **Changes** — UI: `/staff-invite` exchanges a token before establishing the session.
  Backend: token mint/validate/consume in the internal-accounts module, one new server
  function. Schema: three columns on `internal_accounts`.
- **Backend / schema changes** — additive migration, nullable columns, no policy changes.
- **Testing & verification** — invite a fresh address and an existing account; use the link
  immediately, use it a second time (must fail), simulate an expired token, resend (old
  link must die), withdraw (link must die). Verify build is green.
- **Risks & rollback** — blast radius limited to internal staff invitations; members and
  event flows untouched. Reverting the code is safe with the columns left in place.
  Invitations already sent must be resent after deploy.
- **Follow-ups** — none; the wider password-reset flow keeps using the backend default and
  its copy makes no 24-hour promise.
