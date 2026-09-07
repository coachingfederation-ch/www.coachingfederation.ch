# Two changes: email changes from ICF Global, and the Roles screen

---

# Part A — Roles screen behaves the way you described

## Your question, answered

Yes, your description is the right model — and it is not what the screen does
today. The table currently lists **every member who has claimed an account**,
whether or not they hold any extra role. That is why Nadja Blauel (member
9822178) appears: she holds only the ordinary `member` grant. There is no extra
role on her, so there is nothing the Manage button can take away — the row is
not a role, it is her claimed account.

## What we will change

- The table lists **only** people holding a role beyond ordinary member
  (Administrator, Editor, Organizer, Publisher, Membership, Super Admin), plus
  the internal staff accounts it already shows.
- Search covers **all** members by name, email or member number — including
  those with no extra role — so you can find someone and grant them a role from
  the search result. Finding someone is search; being in the table is holding a
  role.
- Manage removes roles as today. When the last extra role is removed the person
  drops out of the table and is back to ordinary member. Their account, member
  profile and Member Area access are untouched — those live on the member
  record, not here.
- Because a test account like Nadja's is a **claim binding**, unbinding it stays
  on the member detail page ("Unlink account"), which already exists. We add a
  short line on the Roles screen pointing there, so the difference between
  "remove a role" and "unlink an account" is visible.

## Technical notes (Part A)

- `listClaimedMemberRoles` in `src/lib/roles-admin.server.ts` gains a filter:
  only rows whose user holds at least one of `GRANTABLE_ROLES`. A second,
  search-only lookup returns candidates from all claimed members matching a
  query, capped and admin-gated.
- `src/routes/_staff/roles.tsx` keeps one search box: it filters the table and,
  when the query matches people not in it, shows a "Grant a role to…" result
  group. Grant reuses the existing `grantMemberRole` path.
- New i18n keys (DE/FR/IT/EN) for the empty state, the search group and the
  unlink hint. No schema change.

---

# Part B — Email changes coming from ICF Global

## The short answer

Today the sync copies a changed email into the member record only. The address a
claimed member signs in with never moves, because the account is bound by an
explicit link (`members.auth_user_id`), never by email. So nothing breaks today
— but the member record and the sign-in address silently drift apart, and
password resets then go to the address the member no longer uses.

Reauthentication is not the right control here: it protects an action a
signed-in person takes. The correct control for a change arriving from an
outside system is a confirmation at the new address, which is what you chose.
That means the "Email change" mail does get used after all — the one of the five
unused templates we now need.

## What we will build

### 1. Detect the drift

When the sync sees `email` change for a member with a bound account, it records
a pending email change on that member and logs a sync event, instead of quietly
moving on.

### 2. The member confirms the new address

- The Member Area shows: "ICF Global has your address as new@example.com.
  Confirm to use it for signing in."
- Confirming sends a one-time link to the new address through the built-in
  email-change flow, so tokens, expiry and rate limits stay the provider's. The
  link goes through our own domain hop like every other auth mail.
- On confirmation the sign-in address is replaced immediately and the old one
  stops working. A courtesy notice goes to the old address, so a wrong change in
  Global is visible to the person who loses access.
- Until confirmed, sign-in keeps working with the old address, and the pending
  change stays visible to the member and to admins.

### 3. Admin controls on the member record

A "Sign-in and access" card on the member detail page, admin only, every action
written to the member event log:

- **Sign-in health** — claimed or not, which address signs in, whether it
  matches Global, last sign-in, any pending email change.
- **Send password reset** — one click, reusing the existing rate-limited path.
- **Nudge the email change** — re-send the confirmation mail.

Not included, by your choice: reading a reset link out over the phone, ending
all sessions.

### 4. Guardrails

- An admin can never set a sign-in address by hand — only Global proposes, only
  the member confirms.
- If the new address already belongs to another account the change is refused
  and flagged, never merged.
- New endpoints are staff-gated or member-scoped; the reset endpoint keeps its
  outcome-neutral response.

## Technical notes (Part B)

- `members` gains `pending_email`, `pending_email_since`, `email_change_state`;
  migration includes GRANTs and RLS (member reads own row, staff read all,
  writes service-role only).
- Detection in `src/lib/member-sync/diff.server.ts` + `member-sync.server.ts`;
  the imported `email` column keeps updating as today.
- Confirmation through the Supabase email-change flow; the `email_change` case
  in `src/routes/lovable/email/auth/webhook.ts` gets chapter branding and the
  existing `chapterAuthUrl` rewrite; `src/routes/auth.confirm.ts` already
  accepts that type.
- New `src/lib/account-security.functions.ts` (member: view / confirm / resend);
  admin actions in `src/lib/member-admin.server.ts` +
  `src/lib/members.functions.ts`, all behind `assertAdmin`.
- Admin reset reuses `requestPasswordReset` rate-limit buckets.
- Member Area notice in the profile screen; admin card in
  `src/routes/_staff/members.$id.tsx`. i18n for DE/FR/IT/EN.

---

## PR note

- **Summary** — The Roles screen now lists only people who actually hold a role,
  with search to grant new ones. Separately, email changes arriving from ICF
  Global no longer drift away from the sign-in address: the member confirms the
  new address, then it replaces the old one, and admins get sign-in health plus
  a password-reset button.
- **Changes** — roles read model + screen (UI only); sync drift detection;
  pending-email columns; member confirmation flow and notice; branded
  email-change mail; admin "Sign-in and access" card; translations.
- **Backend / schema** — one migration adding three columns with GRANTs and
  policies. Part A needs none.
- **Testing** — member 9822178 disappears from the table and is still findable
  by search; grant then revoke leaves the table empty of that person; a bound
  test member with a changed feed email exercises confirm, re-send and
  refuse-duplicate; admin reset send and its rate limit; unclaimed members show
  no notice.
- **Risks & rollback** — Part A is presentation-only and reverts cleanly.
  Part B's blast radius is the member record and one auth flow; reverting the
  code leaves the columns unused and harmless.
- **Follow-ups** — no grace period for the old address; no bulk view of pending
  email changes; sessions are not force-ended.
- **Docs** — `docs/auth-and-claim-flow.md` (roles listing rule, email-change
  flow, admin controls), `docs/member-sync.md` (drift detection),
  `docs/code-map.md`.
