# Reset links on our own domain

Today the password-reset email shows a long technical address from our backend
provider. It works, but it looks foreign and untrustworthy next to the chapter
brand. After this change every link in an authentication email starts with
`https://new.coachingfederation.ch/...`.

## Flow

```text
email button / fallback address
  https://new.coachingfederation.ch/auth/confirm?token=…&type=recovery&next=/reset-password?lang=de
        ↓ (our site, immediate redirect)
  backend verification endpoint
        ↓
  /reset-password?lang=de   → set a new password (unchanged)
```

## What gets built

1. **A confirmation hop on our domain** — a small public route
   `/auth/confirm` that accepts `token`, `type` and `next`, rebuilds the
   provider verification address server-side, and redirects straight to it.
   Nothing is rendered, so there is no flash of an extra page.
2. **Links rewritten in the auth email webhook** — the six auth templates keep
   receiving a `confirmationUrl`, but it now points at `/auth/confirm` on the
   chapter domain. Done once in the webhook, so the recovery, signup, invite,
   magic-link and email-change mails all benefit; the templates themselves are
   untouched.
3. **Safety on the hop**: `type` must be one of the known auth actions, `next`
   must be a same-origin path (leading `/`, no protocol, no `//`), and anything
   else falls back to `/`. A missing or malformed token redirects to
   `/forgot-password` rather than erroring.

## Deliberate boundaries

- No change to how tokens are issued, validated or expired — the provider still
  does all verification. We only move the address the member clicks.
- No change to the reset screens, the neutral confirmation wording, or the rate
  limiting.
- The language carried in `next` keeps working exactly as now, so the localized
  email copy is unaffected.

## Technical notes

- New file `src/routes/auth.confirm.ts` (public, no auth gate), returning a 302
  to `${process.env.SUPABASE_URL}/auth/v1/verify?token=…&type=…&redirect_to=…`.
  Reading `SUPABASE_URL` server-side keeps the provider host out of the email
  body and out of client bundles.
- In `src/routes/lovable/email/auth/webhook.ts`, a helper
  `chapterAuthUrl(data)` parses the incoming `data.url`, extracts `token`,
  `type` and the `redirect_to` path, and returns the `/auth/confirm` address on
  `SITE_URL`. `localeFromAuthData` keeps working off the same parsed values.
- `SITE_URL` currently points at `https://coachingfederation.ch`; the links must
  resolve on the live host, so it is set to the public site origin used by the
  reset redirect (`https://new.coachingfederation.ch`) — confirm which host
  should own the link before implementing.
- If parsing fails for any reason, the original provider URL is used unchanged,
  so an auth email can never be sent with a broken link.

## PR note

**Summary** — Auth emails link to `new.coachingfederation.ch/auth/confirm`
instead of exposing the backend provider's verification address; the new route
redirects to the provider to complete verification.

**Changes**
- UI: none.
- Routing: new public `/auth/confirm` redirect route.
- Email: link rewriting in the auth email webhook; templates unchanged.

**Backend / Schema Changes** — None.

**Testing & Verification** — Request a reset in each of DE/FR/IT/EN and confirm
the mail shows only a chapter address, the button lands on `/reset-password`
with the right language, a second use of the same link fails as before, and an
expired link still shows the invalid-link screen. Also check a signup/invite
mail renders with the new address.

**Risks & Rollback** — Low: one new route plus one helper. Reverting the webhook
restores the previous links immediately; the extra route is inert if unused.

**Follow-ups / Known Debt** — Documentation: `docs/auth-and-claim-flow.md` gains
a short note on the confirmation hop.
