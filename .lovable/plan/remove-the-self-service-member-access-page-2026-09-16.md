# Remove the self-service "Member access" page

Invitations become the only way into the Member Area. The `/claim/<token>`
page that an invited member opens stays exactly as it is.

## What changes for users

- The page at `/claim` (the "Member access" form asking for an email address)
  disappears.
- The sign-in page no longer offers "Claim your account"; it keeps sign-in,
  password reset, and the internal sign-in link.
- An invited member who opens an expired or already-used invitation link now
  sees a short note to contact the chapter office
  (office@coachingfederation.ch) instead of a "start again" link, since there
  is no longer a self-service way to request a new one.
- Staff continue to issue invitations exactly as today, from the member detail
  page and the claim campaign.

## PR note

**Summary** — Remove the public self-service account-claim request page so the
only entry into the Member Area is a staff- or campaign-issued invitation.

**Changes**
- Delete `src/routes/claim.index.tsx` (route `/claim`).
- Delete `ClaimRequestPage` from `src/pages/MemberClaim.tsx`; keep
  `ClaimTokenPage` and the shared `Shell`.
- In `ClaimTokenPage`, replace the `/claim` "restart" link with static support
  copy (new key `claim.needHelp`, en/de/fr/it in `cms.json`).
- Remove the "Claim your account" link block from `src/routes/auth.tsx`.
- Remove the now-unused server functions `requestMemberClaim` and
  `getMemberClaimStatus` from `src/lib/members.functions.ts`, and the
  `attemptMemberClaim` export chain from `src/lib/member-claim.server.ts` /
  `state.server.ts` if nothing else calls it (check first; leave in place if
  the campaign engine uses it).
- Prune the request-form-only i18n keys (`claim.subtitle`, `claim.emailLabel`,
  `claim.submit`, `claim.sentTitle`, `claim.sentBody`, `claim.privacyNote`,
  `claim.closedTitle`, `claim.closedBody`, `claim.restart`, `auth.claimAccount`)
  from all four locale files; keep every key the token screen uses.
- Update `docs/auth-and-claim-flow.md`: the claim flow starts with an issued
  token only, and the `account_claim_enabled` gate now governs token redemption
  and campaign sending rather than a public form.

**Backend / schema changes** — None. No migration, no policy change. The
`account_claim_enabled` flag and the token tables stay as they are.

**Testing & verification**
- `/claim` returns the app's not-found page; no dead links remain (`rg` for
  `/claim"` and `claim.` keys).
- A valid invitation token still renders the password screen and completes the
  claim; an invalid token shows the new support copy.
- Sign-in page renders without the claim link in all four languages.
- Prettier, `tsgo --noEmit`, build clean.

**Risks & rollback** — Low; presentation and dead-code removal only. Revert the
commit to restore the page. Anyone holding a bookmark to `/claim` lands on the
not-found page — acceptable, as claiming was never opened publicly.

**Follow-ups** — If self-service is ever wanted again, reintroduce it as a
rate-limited form rather than restoring the removed code as-is.
