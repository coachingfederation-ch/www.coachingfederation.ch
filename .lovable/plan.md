# Guest Passes — member form, M&E queue, privacy policy

Final step of the guest-first Guest Pass flow. The guest claim page and `invited` status already
exist; this aligns the three surfaces that still describe the old flow.

## 1. Member panel (event page)

`src/components/events/GuestPassPanel.tsx`

- Remove phone, location, preferred language, coaching level, focus, associations and notes from
  the form and its state. Keep the read-only inviter snapshot, guest full name, guest email.
- Add a required, unchecked attestation checkbox: "I have told this person I am sharing their name
  and email so ICF Switzerland can invite them to complete this Guest Pass." Submit is disabled
  until it is ticked, and `attested` is passed from it instead of the current hardcoded `true`.
- Success copy: the guest was emailed a link; Membership & Engagement reviews after they submit.
- Footer privacy line replaced with the truthful version (we share name and email with the guest
  in the invitation; they complete their own details; M&E only sees the request afterwards).
- `alreadyRequested` stays as is — the existing count already covers `invited` and `pending`.

## 2. Member Area list

`src/components/member/GuestPassesCard.tsx` needs no structural change (it already shows only the
guest name). Add the `invited` status label ("Waiting for guest") under
`member.home.guestPasses.status.*` in all four `cms.json` files.

## 3. Membership & Engagement queue

`src/lib/guest-passes.functions.ts`

- Extend `StaffGuestPass` and the `listAllGuestPasses` select with `followUpConsent`,
  `followUpConsentAt`, `guestCoachingLevel`, `guestProfessionalFocus`, `guestOtherAssociations`,
  `guestCompletedAt`, plus the event end date needed for the retention line.
- New `getGuestPass({ passId })` server function gated by `assertMembership`, returning the same
  shape for one row; unknown id returns null.
- `ApprovedGuestsPanel` (community/project leaders) is untouched — still name + inviting member.

`src/components/manage/GuestPassesDashboard.tsx`

- Sixth count "Waiting for guest" = `status === 'invited'`; Requests stays pending-only.
- `invited` added to `STATUS_FILTERS` and to `STATUS_TONE` (muted/warn tone).
- `invited` rows: hide Approve and Decline, show a muted "Waiting for the guest to complete their
  details." note; Cancel stays available so a mistyped address can be withdrawn.
- Each row gets a consent chip (`Opted in` / `No follow-up`) and a **View** link to the detail
  page. No phone, coaching background, focus, associations or notes on the list.
- Follow-up dialog: when consent is false, show a line saying the guest did not opt in to
  community follow-up — notes may still be recorded, no marketing send implied.

New route `src/routes/_staff/manage.guest-passes.$id.tsx` with the same
`requireStaffAccess(..., MEMBERSHIP_ROLES)` gate, rendered in the staff `Shell`, using existing
design-system card/badge/dialog treatments. Sections in order: status + event (back link), guest
identity, guest profile (this page only, em dash for empty optionals), inviting member snapshot,
consent vs retention (two separate facts, with the "withdrawal does not delete early" help text
and the computed "kept until {event end + 365 days}" date in Europe/Zurich), decision, follow-up.
Unknown id renders the existing empty copy with a link back to the list.

## 4. Privacy policy

- `src/pages/privacy/DataProcessing.tsx`: new subsection **i) Guest Pass data** — what comes from
  the inviting member, what the guest provides, recipients (M&E; leaders see name + inviter only),
  purposes, how it differs from a paid ticket, and the 12-month automatic deletion. Section f)
  stays as it is.
- `src/pages/privacy/Purposes.tsx`: purposes-table row "Administering Guest Passes" / "Guest Pass
  data"; legal-framework bullets for event administration and for the consent-based optional
  follow-up; a 4a source bullet for data received from an inviting member.
- `src/pages/privacy/Retention.tsx`: table row for Guest Pass records — 12 months after the event
  ends, deleted by a daily job, complimentary registration anonymised at the same time, withdrawal
  of consent does not erase the record early.
- Claim-page privacy paragraph in `events.json` checked so it states the 12-month keep and that
  withdrawing follow-up does not delete the record early. No "30 days" copy anywhere.

## 5. i18n

All new strings (`events.guestPass.*`, `guestPasses.status.invited`, `guestPasses.counts.*`,
`guestPasses.detail.*`, `member.home.guestPasses.status.invited`) added to EN, DE, FR and IT. No
English-only strings, no real member data in code or preview data.

## PR note

**Summary** — Aligns the member request form, the M&E queue and the privacy policy with the
guest-first Guest Pass flow: members share only a name and email, guests complete their own
profile, and staff get a detail view plus an explicit consent/retention picture.

**Changes**
- UI: reduced member panel + attestation; `invited` status in the member card, dashboard counts,
  filters and row actions; new staff detail route; consent chip and View link on the list.
- Backend: `StaffGuestPass` projection widened (consent, profile fields, event end); new
  `getGuestPass` server function behind `assertMembership`.
- Content: privacy subsection i), purposes rows and legal bases, retention row; four-locale copy.

**Backend / schema changes** — None. No migration, no RLS change; the `invited` status, columns
and approve-guard already shipped.

**Testing & verification** — Member panel as an active member (attestation gating, success copy);
M&E dashboard as a membership-role account (counts, `invited` filter, hidden Approve/Decline,
detail page for an invited row and a pending row, unknown id); leader panel unchanged; each locale
renders without missing keys; build clean.

**Risks & rollback** — Presentation-only, blast radius limited to the Guest Pass surfaces and the
privacy page. Revert by reverting the commit; no data migration to unwind.

**Follow-ups / known debt** — CSV export headers are not extended with the new profile/consent
columns in this change; the detail page reads through the list query rather than a cached loader.
