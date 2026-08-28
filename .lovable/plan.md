# Guest Passes — the guest completes their own profile

Today the inviting member types the guest's phone, location, language and coaching background, and the guest never sees a privacy notice. This change flips it: the member shares only a name and an email, the guest opens a personal link, fills in their own details, reads the privacy notice, and only then does Membership & Engagement see a request to decide.

Guest Pass records are also deleted automatically 12 months after the event, by a daily job — the same horizon the privacy policy already states for event registration.

## Flow after this change

```text
member names guest  ->  status "invited"  ->  guest opens link, completes form
                                                   |
                                          status "pending"  ->  M&E approves
```

- The member's request no longer notifies the chapter office. The office is notified when the guest has completed the form.
- "invited" and "pending" do not consume the guest's one pass — only approved / registered / attended do.
- M&E cannot approve an "invited" row; approval stays reserved for completed requests.

## 1. Database (one migration)

- New status value `invited` on `guest_passes.status`; existing `pending` rows stay untouched and remain approvable.
- `guest_phone` and `guest_location` become optional (the guest supplies them later, and both are optional for them).
- New columns: hashed invitation token, invited-at, guest-completed-at, follow-up consent flag and timestamp, privacy notice version. The raw token is never stored — only its SHA-256 hash, uniquely indexed.
- The existing guard trigger is updated: a member's insert is forced to `invited`; the one-pass rule counts only approved/registered/attended; the trusted server path may move `invited -> pending` and write the profile and consent; members still cannot promote or decide a row themselves.

## 2. Invitation link and token

Token helpers mirror the event-invitation ones (32 random bytes, base64url, SHA-256 at rest):

- mint a token when the member names the guest,
- resolve a token to just the claim page's read-only facts (inviting member's name, event title and date, guest name and email) — never another guest's row, never phone or coaching fields,
- complete the profile once: sets the fields, consent, notice version and completion time, moves the row to `pending`, and clears the token so the link cannot be reused. Re-opening a completed link shows a stable "already completed" state rather than an error.

Eligibility gains the 12-month rule: an address whose spent pass sits on an event less than 12 months old is blocked; after the purge removes that row, the same address may be invited again. No hashed email list is kept — the row itself is the record.

## 3. Automatic deletion after 12 months

A daily job, built exactly like the existing live-chat retention job and authorised with the same cron token:

1. find guest passes whose event ended more than 365 days ago,
2. anonymise the complimentary registration that pass created (name, email, notes, answers) so no guest personal data survives and the seat's uniqueness constraint still holds — other attendees are never touched,
3. delete the guest pass rows outright, taking tokens, contact details, consent and decision notes with them.

Withdrawing follow-up consent stops outreach but does not delete the record early; the 12-month clock still applies.

## 4. What the member submits

The member form's server contract shrinks to event, guest name, guest email, and an attestation that the member has told the guest their name and email will be shared so we can invite them. (The member-facing form itself is trimmed in the next step; nothing visible changes here.)

On submit: the row is created as `invited`, a token is minted, the guest receives a new invitation email with their personal claim link, and the member receives a short confirmation with no token in it.

## 5. The guest's claim page

A new public page at `/guest-pass/<token>` — no login, the token is the credential, never indexed, standard site header and footer, and the same style of fallback as the ticket page when a link is unknown, used or withdrawn ("This invitation is no longer valid. Write to office@coachingfederation.ch").

The page shows who invited them, which event and when, and asks for: preferred language, and — all optional — phone, location, coaching level or background, main area of activity, other coaching associations, and a note.

Below the fields, a privacy notice explains what we do with the details, that community and project leaders of the event will see their name and who invited them, the 12-month retention, and how to reach us. Submitting the form is the act; there is no "I agree" tickbox on event administration. A separate, unchecked box offers optional follow-up contact after the event.

Submissions are rate-limited per visitor (8 per 10 minutes, 40 per day — the waitlist windows). On success the page thanks them and says Membership & Engagement will confirm by email; the chapter office is notified now, and the inviting member is told the guest completed the form.

## 6. Languages

Every new string — claim page, notices, errors, success, optional-field hints — ships in German, French, Italian and English. Email preview data uses placeholders only.

## Technical notes

- Migration: `status` CHECK extension, nullable `guest_phone`/`guest_location`, new columns `invite_token_hash`, `invited_at`, `guest_completed_at`, `follow_up_consent`, `follow_up_consent_at`, `privacy_notice_version`, unique partial index on `invite_token_hash`, and a rewritten `public.tg_guest_pass_guard`.
- `src/lib/guest-passes.server.ts`: `mintGuestPassInviteToken`, `resolveGuestPassToken`, `completeGuestPassProfile`, `GUEST_PASS_RETENTION_DAYS = 365`, `purgeExpiredGuestPasses`; `resolveGuestEligibility` treats `invited` like `pending` and scopes `used` to the 12-month window.
- `src/lib/guest-passes.functions.ts`: `requestSchema` reduced to `eventId`, `guestFullName`, `guestEmail`, `attested: z.literal(true)`; insert as `invited`; no `guest-pass-request` send here; `approveGuestPass` returns `{ ok: false, reason: 'not_pending' }` for `invited`. New unauthenticated `getGuestPassClaim` / `completeGuestPassClaim` server fns (no `requireSupabaseAuth`), rate-limited via `checkRateLimit`.
- New templates `guest-pass-invite` (guest, claim URL via `SITE_URL` + `localizePath` in the event's language, idempotency `guest-pass-invite-<passId>`, Reply-To office) and `guest-pass-member-invited` (inviter, tokenless), both registered in `src/lib/email-templates/registry.ts`. `guest-pass-request` now fires on guest completion.
- New route `src/routes/guest-pass.$token.tsx` following `src/routes/ticket.$token.tsx` (no `$locale` twin — token routes are not localised in this project); UI from the design system only.
- New route `src/routes/api/public/guest-pass-purge.ts` (POST, `isAuthorisedCronRequest`), plus a daily pg_cron/pg_net schedule documented in a comment on the route.
- i18n keys under `events.guestPass.claim.*` in all four `events.json` locales; `invited` status label added where guest-pass statuses render.

## PR note

**Summary** — Guest Pass moves the guest's own data collection to the guest: the member shares name and email only, the guest completes a token-linked profile with a privacy notice, and the request only reaches M&E after that. Adds automatic deletion of Guest Pass data 12 months after the event.

**Changes**
- UI: new public claim page with profile form, privacy notice and optional follow-up consent; DE/FR/IT/EN strings.
- Server: token mint/resolve/complete helpers, reduced member submit schema, approve guard against `invited`, retention purge, new cron route, three email template changes.
- Backend/schema: one migration (status value, nullable columns, six new columns, index, guard trigger) plus a daily cron schedule.

**Backend / schema changes** — As above. No new tables. No grant changes; the new columns are covered by the existing table grants and the guard trigger keeps untrusted writers out of them.

**Testing & verification** — Member submit creates an `invited` row and mails only the guest and the inviter; the claim link completes once and then shows the already-completed state; a tampered or reused token shows the invalid-invitation fallback; office and inviter are notified on completion; approve refuses an `invited` row and still works for `pending`; a second invite to the same address is refused while a live pass exists and allowed after the purge; purge anonymises only Guest Pass registrations; rate limit trips at the waitlist thresholds; all four locales render.

**Risks & rollback** — Blast radius is the guest-pass surface, one trigger and one new cron job. The migration is additive and the trigger reverts to its previous body; existing `pending` rows are deliberately left alone so nothing in the M&E queue changes behaviour. The purge deletes data irreversibly, so it ships with the 365-day constant and a logged `deleted=N` count for the first runs.

**Follow-ups / known debt** — Member form field list, M&E queue gating and the `/privacy` text land in the next step; no reminder if a guest never opens their link; no admin re-send of a claim link yet.
