# Guest Passes — Step 3: approval, comped registration, tracking

Closes the pilot loop: Membership & Engagement (M&E) decides on each request, an approved guest gets a free seat and a ticket by email, the community leader hosting the event sees who is coming, and M&E can track attendance, follow-up and conversion — with a CSV for the pilot report.

## What already exists (verified)

- `guest_passes` table carries every field this step needs: decision (`decision_by`, `decision_at`, `decision_note`), `registration_id`, follow-up (`follow_up_status`, `follow_up_note`, `converted_member_id`).
- Access rules are already in place: M&E staff can read and update all passes; event managers can read the passes for events they manage; members read their own.
- Members can already submit a request (step 2), and the comped-seat pattern used by staff-added attendees is available to copy.

## What gets built

### 1. Approve, decline, cancel (M&E only)

A single membership guard is added and applied to every new action: Super Admin, Administrator, or the M&E (`membership`) role.

- **Approve** — records the decision, then creates the guest's free seat and emails them their ticket. Also emails the event's community leader (falling back to the chapter office address) and the inviting member, so both know who is coming. Approving twice does nothing the second time — no duplicate seat, no duplicate email.
- **Decline** — records the decision with a note and emails the inviting member.
- **Cancel** — withdraws a pending or approved request; if a seat was already created it is cancelled too, freeing the place. Confirmation dialog first.

The comped seat is deliberately plain: no price, no payment hold, no ticket tier unless the event sells tickets and a free tier exists. It is marked as staff-created with the note "Guest Pass" so it is visible in the attendee list and the attendee CSV.

### 2. M&E dashboard

A new staff screen (`/manage/guest-passes`, M&E-gated) listing every request with counts at the top: requests pending, approved/registered, attended, declined/cancelled, converted to member. Filter by status.

Each row shows the inviting member (name, membership number, membership status — read-only snapshot), the guest (name, email, phone, location, preferred language), the event and the decision note. Guest contact details are visible to M&E only.

Row actions: approve, decline, cancel, and — for events that have already happened — a follow-up control (not contacted / contacted / converted / closed) with a note. When the guest's email now matches an active member record, the row flags it as a conversion and lets M&E link that member.

### 3. Attendance and leader visibility

- When a guest's seat is scanned at the door, their pass automatically flips to "attended". Check-in for everyone else is unchanged.
- On the event management screen, community and project leaders get a read-only "Approved guests" panel: guest name and which member invited them. No approval power, no guest contact details.

### 4. CSV export

An M&E export of all passes: event, inviting member, guest, status, decision date, attended, follow-up status and note, converted member — matching the existing attendee-CSV format and escaping rules.

### 5. Languages

Every new label, status, action, follow-up option, empty state, confirmation dialog and CSV header is added in German, French, Italian and English. Nothing ships English-only.

## Technical notes

- `assertMembership(context)` in `src/lib/authz.ts` (`admin | administrator | membership`), used by all new server functions.
- `createGuestRegistration(passId, actorUserId)` in `src/lib/guest-passes.server.ts`, using the service-role client because M&E is not necessarily the event's organizer. Order: load pass (must be `approved`) → no-op if `registration_id` set → insert `event_registrations` (`status confirmed`, `payment_status not_required`, `amount_cents 0`, `created_by_staff`, locale from the guest's preferred language, `notes = "Guest Pass"`, `tier_id` null unless a valid free tier on an `rsvp_tickets` event) → set `registration_id` + `status = 'registered'` → send via `sendRegistrationConfirmation(id, { force: true })` behind a claim-then-send guard; a send failure is recorded on the registration row and never thrown at the caller.
- New server functions in `src/lib/guest-passes.functions.ts`: `approveGuestPass`, `declineGuestPass`, `cancelGuestPass`, `listAllGuestPasses`, `setGuestPassFollowUp`, `exportGuestPasses`, plus `listApprovedGuestsForEvent` for the leader panel (read through the caller's own client so `private.event_is_managed_by` applies).
- Two email templates + copy files, mirroring the existing invitation templates: `guest-pass-approved` (leader + inviting member) and `guest-pass-declined` (inviting member). Leader address resolved from the event's community `public_contact_email` with the chapter office fallback, same lookup as event invitations.
- One migration: extend `public.check_in_registration` so a successful check-in also sets the linked `guest_passes.status = 'attended'` (join on `registration_id`). No schema changes — every column and access rule needed already exists.
- CSV builder in a new `src/lib/guest-passes-export.server.ts`, reusing the formula-injection escaping from `registrations-export.server.ts`.
- Dashboard route `src/routes/_staff/manage.guest-passes.tsx` with the page component under `src/components/manage/`, built from design-system primitives only.

## PR note

**Summary** — Adds the M&E decision queue for guest passes, auto-creates and emails a comped seat on approval, links attendance and conversion, and exposes a CSV for pilot tracking.

**Changes**
- UI: new M&E dashboard with counts, filters, row actions and follow-up; read-only approved-guests panel on the event management screen; DE/FR/IT/EN strings.
- Server: `assertMembership` guard; approve/decline/cancel/follow-up/list/export server functions; trusted `createGuestRegistration` helper; two new email templates.
- Backend/schema: one migration extending `check_in_registration` to mark the linked pass attended.

**Backend / schema changes** — Migration to `public.check_in_registration` only. No new tables, columns, grants or policies.

**Testing & verification** — Approve → seat created once on double click, guest ticket email sent, leader + inviter notified; decline and cancel paths incl. seat release; check-in marks pass attended and leaves other attendees unchanged; leader sees the panel but no guest contact details; a member without the M&E role is refused; CSV opens correctly with commas and quotes in names; all four locales render.

**Risks & rollback** — Blast radius is the guest-pass surface plus one database routine; the check-in change is additive and reverts by restoring the previous function body. Comped rows are ordinary registrations, so cancelling one behaves like any other seat.

**Follow-ups / known debt** — Conversion detection is by email match at read time (no stored link until M&E confirms); no bulk approve; no automated reminder to M&E about ageing pending requests.
