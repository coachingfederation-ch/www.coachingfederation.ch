# Password reset via the registered email

Members who already have an account can reset their own password from the
member sign-in screen. Staff sign-in keeps Google as its main path and is not
changed.

## Flow

```text
/auth  →  "Forgot your password?"  →  /forgot-password
             enter email → neutral confirmation (always the same)
                       ↓ (email sent only if an account exists)
        branded reset email (DE/FR/IT/EN)  →  /reset-password
                       ↓
        set a new password → signed in → role-based landing page
```

## What gets built

1. **Forgot-password screen** (`/forgot-password`), reusing the existing
   `AuthCard` shell and language chips so it looks identical to sign-in.
   Submitting always shows the same neutral message — "If that address has an
   account, we've sent a reset link" — regardless of whether an account exists.
   No hint about membership or claim status.
2. **Reset screen** (`/reset-password`), a public route that accepts the
   recovery link, asks for a new password twice, applies it, and then sends the
   user to their normal landing page (member area or CMS, decided by roles).
   An expired or already-used link shows a clear message and a link back to
   request a new one.
3. **"Forgot your password?" link** on the member sign-in card only.
4. **Branded, localized reset email.** Scaffold the auth email templates so the
   reset mail matches the existing ICF emails (Deep Blue header, chapter
   wording, member-claim invitation styling) and is delivered in DE, FR, IT or
   EN. The other five auth templates get the same shell so nothing falls back
   to a plain default.
5. **New copy** added under the existing `auth.*` keys in all four locale
   files.

## Deliberate boundaries

- Reset works only for accounts that already exist. It does not create
  accounts and does not bypass or replace the member claim flow, which stays
  the only way an imported member gets an account.
- The reset link goes to the address on the auth account. It is never resolved
  by looking a member up in the directory — no ICF member data is exposed and
  no email-based binding is introduced.
- Password reset requests are rate limited so the endpoint cannot be used to
  probe which addresses have accounts or to spam a mailbox.

## Technical notes

- `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`
  from the client; `/reset-password` is a public top-level route (never under
  `_authenticated`/`_member`), handles the recovery hash, and calls
  `supabase.auth.updateUser({ password })`.
- Landing after a successful reset reuses `landingPathForSession` so routing
  stays role-driven.
- Auth emails use `scaffold_auth_email_templates` against the already
  configured sender domain; templates live in `src/lib/email-templates/` next
  to the current transactional ones and follow the same locale-copy pattern
  (`*-copy.ts`) used by `member-claim-invitation`.
- Rate limiting reuses `checkRateLimit` in `src/lib/rate-limit.server.ts` via a
  thin public server function, plus raising the hourly auth-email cap to a
  realistic value.
- New i18n keys: `auth.forgotPassword`, `auth.resetTitle`, `auth.resetSub`,
  `auth.resetSent`, `auth.newPassword`, `auth.confirmPassword`,
  `auth.resetLinkInvalid`, `auth.resetDone`.

## PR note

**Summary** — Adds self-service password reset for existing accounts, reachable
from member sign-in, with branded localized reset emails.

**Changes**
- UI: `/forgot-password` and `/reset-password` routes; "Forgot your password?"
  link on `/auth`; new `auth.*` strings in DE/FR/IT/EN.
- Email: scaffolded auth email templates restyled to ICF brand, localized.
- Backend: rate-limited request endpoint; auth email hourly limit raised. No
  schema changes.

**Backend / Schema Changes** — None (no migrations, no new tables or policies).

**Testing & Verification** — Reset requested for a claimed member account, an
internal admin account, and an address with no account (must be
indistinguishable); expired link, reused link, and mismatched password
confirmation; all four locales; sign-in with the new password afterwards.

**Risks & Rollback** — Low blast radius: new routes plus one link. Reverting the
routes fully removes the feature; the scaffolded email templates are inert if
unused.

**Follow-ups / Known Debt** — Password strength policy (leaked-password check)
is not part of this change and can be enabled separately.
