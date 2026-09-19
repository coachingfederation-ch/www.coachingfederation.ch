# Honour the correspondence language in automated emails

## What I found

The correspondence language a member sets on their profile is stored and is
already used by the member engagement emails (welcome, re-engagement, grace
period warnings) and by the grace-period notices. It is **not** used by two
other automated emails:

1. **Password reset.** The language is taken from the language chips on the
   sign-in screen (a browser setting that defaults to English), never from the
   member's saved preference. A member who has chosen German gets an English
   reset mail unless they happened to switch the screen to German first — this
   is exactly the case you saw.
2. **Account claim invitation.** The invitation is sent with no language at
   all, so it always falls back to English, both for staff-triggered sends and
   for the pilot/claim campaign.

Event emails (confirmation, reminder, cancellation, certificate) use the
language the person registered in, which is correct and stays as is.

## What gets changed

1. **Password reset follows the member's preference.** When a reset is
   requested, the server looks up the saved correspondence language for that
   address and uses it for the email and for the reset page the link opens.
   If there is no saved preference (or no member record), it falls back to the
   language chosen on the screen, then to English. The lookup happens entirely
   server-side and the response stays exactly as neutral as today — the screen
   never reveals whether an address belongs to a member.
2. **Claim invitations follow the member's preference.** Both the staff
   "send invitation" action and the campaign waves pass the member's
   correspondence language into the invitation email, with English as the
   fallback.
3. **Docs.** Record the rule in `docs/member-translations.md`: automated mail
   to a known member always uses their correspondence language; mail tied to a
   one-off action (event registration) uses the language of that action.

## Technical notes

- `src/lib/password-reset.functions.ts`: after the rate-limit checks, read
  `members.correspondence_locale` for the lowercased address with the admin
  client and use it in place of `data.locale` when present. The returned value
  is never surfaced; timing stays uniform because the lookup runs for every
  allowed request. The chosen language keeps travelling in
  `/reset-password?lang=xx`, which the auth webhook already reads
  (`localeFromAuthData`) to pick `RecoveryEmail`'s copy — no webhook change.
- `src/routes/reset-password.tsx`: apply the `lang` query parameter to the CMS
  locale on mount so the reset page matches the email.
- `src/lib/member-claim/email.server.ts` already accepts `locale`; the two call
  sites omit it. `state.server.ts` selects the member row already — add
  `correspondence_locale` to that select and pass it.
  `waves.server.ts` — add `correspondence_locale` to the candidate query and
  pass it into `deliverClaimInvitation`.
- No schema changes, no new tables or policies.

## PR note

**Summary** — Automated member mail (password reset, claim invitation) now uses
the member's saved correspondence language instead of the browser's interface
language or an English default.

**Changes**
- Password reset: server-side lookup of the member's correspondence language;
  reset page honours the `lang` parameter.
- Claim invitation: language passed from the member record at both call sites.
- Docs: language-selection rule recorded in `docs/member-translations.md`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Reset requested for a member with German set while
the screen is in English (email and reset page must be German); a member with
no preference (falls back to screen language, then English); an address with no
account (same neutral confirmation, no timing difference); claim invitation and
reminder for members set to DE/FR/IT/EN.

**Risks & Rollback** — Small: two send paths and one page. Reverting the two
files restores current behaviour; no data is migrated.

**Follow-ups / Known Debt** — Event emails intentionally keep the registration
language; a future pass could prefer the correspondence language when the
registrant is a known member.
