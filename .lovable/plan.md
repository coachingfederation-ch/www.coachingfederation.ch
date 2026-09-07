# Email changes from ICF Global, and admin help with sign-in

## The short answer

Today the sync copies a changed email into the member record only. The address a
claimed member actually signs in with never moves, because the account is bound
by an explicit link (`members.auth_user_id`), never by email. So nothing breaks
today — but the member record and the sign-in address silently drift apart, and
password resets then go to the address the member no longer uses.

Reauthentication is not the right control here: it protects an action a
signed-in person takes. The correct control for a change that arrives from an
outside system is a confirmation at the new address, which is what you chose.
That means the "Email change" auth mail does get used after all — it is the one
of the five unused templates we now need.

## What we will build

### 1. Detect the drift

The sync already compares field by field. When `email` changes for a member who
has a bound account, we record a pending email change on that member instead of
quietly moving on, and log it as a sync event.

### 2. Member confirms the new address

- The member sees a clear notice in the Member Area: "ICF Global has your
  address as new@example.com. Confirm to use it for signing in."
- Confirming sends a one-time confirmation link to the new address, using the
  built-in email-change flow (so tokens, expiry, and rate limits are the
  provider's, not hand-rolled). The link goes through our own domain hop, like
  every other auth mail.
- Once confirmed, the sign-in address is replaced immediately; the old address
  stops working. A courtesy notice goes to the old address ("your sign-in
  address was changed") so a wrong change in Global is visible to the person who
  loses access.
- Until confirmed, sign-in keeps working with the old address and the pending
  change stays visible to the member and to admins.

### 3. Admin controls on the member record

A "Sign-in and access" card on the member detail page, admin only, every action
written to the member event log:

- **Sign-in health** — is the account claimed, what address it signs in with,
  whether that matches Global, last sign-in, and any pending email change.
- **Send password reset** — one click, reusing the existing rate-limited reset
  path so an admin cannot mail-bomb an address either.
- **Nudge the email change** — re-send the confirmation mail for a pending
  change.

Not included, by your choice: reading a reset link out over the phone, ending
all sessions.

### 4. Guardrails

- An admin can never set a sign-in address by hand — only Global proposes, only
  the member confirms. That keeps "email equality is never authority" intact.
- If the new address already belongs to another account, the change is refused
  and flagged for staff rather than merging two people.
- All new endpoints are staff-gated or member-scoped, and the reset endpoint
  keeps its outcome-neutral response.

## Technical notes

- `members` gains `pending_email`, `pending_email_since`, `email_change_state`;
  migration includes GRANTs and RLS (member reads own row, staff read all,
  writes service-role only).
- Detection in `src/lib/member-sync/diff.server.ts` + `member-sync.server.ts`;
  the imported `email` column keeps updating as today.
- Confirmation via `supabaseAdmin.auth.admin` / `updateUser` email-change flow;
  `email_change` case in `src/routes/lovable/email/auth/webhook.ts` restyled to
  chapter branding, links rewritten by the existing `chapterAuthUrl` helper;
  `src/routes/auth.confirm.ts` already accepts the `email_change` type.
- New `src/lib/account-security.functions.ts` (member: view/confirm/resend) and
  admin actions added to `src/lib/member-admin.server.ts` +
  `src/lib/members.functions.ts`, all through `assertAdmin`.
- Admin reset reuses `requestPasswordReset` rate-limit buckets.
- Member Area notice in the profile screen; admin card in
  `src/routes/_staff/members.$id.tsx`.
- i18n keys for DE / FR / IT / EN.

## PR note

- **Summary** — Email changes arriving from ICF Global no longer drift away from
  the sign-in address: the member confirms the new address, then it replaces the
  old one. Admins get sign-in health and a password-reset button.
- **Changes** — sync drift detection; pending-email columns; member confirmation
  flow and Member Area notice; branded email-change mail; admin "Sign-in and
  access" card; translations.
- **Backend / schema** — one migration adding three columns with GRANTs and
  policies; no destructive change.
- **Testing** — a bound test member with a changed feed email; confirm,
  re-send, and refuse-duplicate paths; admin reset send and its rate limit;
  unclaimed members show no notice.
- **Risks & rollback** — blast radius is the member record and one auth flow;
  reverting the code leaves the columns unused and harmless.
- **Follow-ups** — no grace period for the old address; no bulk view of all
  pending email changes; sessions are not force-ended.
- **Docs** — `docs/auth-and-claim-flow.md` (email-change flow, admin controls),
  `docs/member-sync.md` (drift detection), `docs/code-map.md` (new module).
