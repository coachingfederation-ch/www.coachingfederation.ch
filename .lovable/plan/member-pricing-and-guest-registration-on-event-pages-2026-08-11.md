# Member pricing and guest registration on event pages

## What I found (verified against the live database and code)

**1. Why your account is not recognised as a member.**
Membership is resolved server-side in `resolveMembership()`. It correctly finds
your account through the `auth_user_id` link, then applies a second test: the
membership expiry date must be today or later. In the current member data that
test fails for almost everyone — 500 of 501 member records carry an expiry date
in the past, including all four linked accounts (latest: 31 May 2026). The last
member sync ran on 5 August 2026, so this is what the feed delivers, not a
stale import. The activity state (`active`) is the signal the rest of the site
already trusts for directory eligibility.

**2. Why the form is hidden when signed out on this event.**
The panel already renders the full registration form for anonymous visitors.
This particular event has "guest registration" switched off in the event
editor, so the panel replaces the form with a members-only notice and a sign-in
button. That is the toggle doing its job, not a bug.

**3. Member ID entry does not exist yet in the UI.**
The server already accepts and verifies a member ID (`memberId`) on
registration, and rate-limits it — but only for signed-in visitors, and no
field in the form ever sends it.

## Plan

### A. Fix membership recognition
- Treat an active membership record linked to the account as a member, using
  the same rule as the rest of the site (`activity_state = 'active'`).
- Keep an expiry check only as a guard against records the sync has explicitly
  marked expired or inactive, so a genuinely lapsed member is still refused.
- This makes your linked account resolve to "member" immediately.

### B. Show the form to everyone, with a member path
- Turn guest registration on for this event (event editor toggle) so the public
  can register. The flag stays a per-event organizer setting; no code change to
  how it works.
- Whenever a member-priced tier exists, the panel shows a short member block:
  "Already a member? Sign in — or enter your ICF member ID."
  - Signed-out and signed-in visitors both get the ID field.
  - Entering an ID and pressing "Apply" verifies it and, on success, unlocks the
    member tier and shows a confirmation line. On failure it shows one neutral
    message ("We couldn't confirm this member ID") — never revealing whether the
    ID exists.
- The member tier stays locked in the UI until membership is confirmed.

### C. Verify member IDs safely
- New public server function `verifyMemberId` that checks the ID against an
  active, unexpired member record and returns only `confirmed: true | false`.
- Rate-limited per IP for anonymous callers and per account for signed-in ones
  (5 attempts / 5 min, 30 / day), reusing the existing limiter.
- The submit path re-verifies the ID server-side before pricing, so a
  manipulated client can never buy a member ticket. The apply step is only an
  advisory preview of what the server will decide.

## Technical notes
- `src/lib/tickets.server.ts` — `isActiveMember` rule change; `resolveMembership`
  gains an anonymous path (member ID without a user id), keyed on IP for limits.
- `src/lib/tickets.functions.ts` — add `verifyMemberId`; `getMyMembershipState`
  accepts an optional member ID.
- `src/components/events/EventRegistrationPanel.tsx` — member block with ID
  field and Apply, confirmed/failed states, member ID passed on submit.
- `src/lib/events.functions.ts` — `submitGuestRegistration` stops hard-coding
  `memberId: null` and forwards the submitted ID for server-side verification.
- New i18n strings in `events.json` for EN/DE/FR/IT.
- No schema change.

## PR note
- **Summary** — Members with a linked account are recognised again, and anyone
  can register for an event while members can claim member pricing by signing in
  or entering their ICF member ID.
- **Changes** — UI: member block and ID field in the registration panel.
  Backend: membership rule corrected, public member-ID verification endpoint,
  guest submit path forwards the ID. Content: new registration strings in four
  languages. Config: guest registration enabled on this event.
- **Backend / schema changes** — None (no migration; existing rate-limit table
  reused).
- **Testing & verification** — Signed out, signed in as a linked member, signed
  in as a non-member; valid ID, invalid ID, expired member ID; free tier and
  paid tier through Stripe checkout; rate-limit lockout after repeated bad IDs;
  server-side refusal when a member tier is requested without entitlement.
- **Risks & rollback** — Blast radius is the event registration panel and
  membership resolution (also used by the ticketing read path). Revert is a
  code-only rollback; no data migration to undo.
- **Follow-ups / known debt** — Member expiry dates in the ICF feed are almost
  entirely in the past; worth raising with the data source. We do not store
  which member ID was used for a discounted registration — useful later for
  reconciliation.