# Guest Passes — Step 2: the member request flow

An active member, signed in and looking at an event that offers guest passes, can ask for one free seat for a non-member guest. The request lands as a pending record for Membership & Engagement, and the coordinator gets an email that something is waiting. No decision screen and no email to the guest yet — those are step 3.

## What the member sees

**On the event page** (only when the event has guest passes switched on):

- Signed-in active member: a "Request a Guest Pass" panel below the registration box. Their own details (name, email, ICF number) are shown read-only, pulled from their member record — they cannot type someone else's. Below that, the guest fields: full name, email, phone, location, preferred language (DE / FR / IT / EN), coaching level or background, main area of activity, other coaching associations, and an optional note. Required fields are everything except the last two.
- After submit: a success state — "Thanks, your request is with Membership & Engagement. We'll confirm by email." — or a plain-language reason it could not be taken (this guest already used a pass, a request for this event already exists, registration is closed).
- Signed-out or not a member: no form, just one line — "Guest Passes are for members of The Switzerland Chapter of ICF."
- The event is never a dropdown; the request is always for the page being viewed.

**In the Member Area** (`/member`): a "My guest passes" block listing the member's own requests — event title and date, guest name, status, and the decision note when a request was declined. Read-only.

## Technical notes

### Server function — `src/lib/guest-passes.functions.ts`

`submitGuestPassRequest`, `createServerFn({ method: "POST" })` with `.middleware([requireSupabaseAuth])` and a zod validator (`eventId` uuid; guest fields trimmed and length-capped; `guestPreferredLanguage` an `en|de|fr|it` enum; associations and note optional).

Handler order, mirroring `submitRegistration`'s trust model — every fact is re-derived server-side, nothing is taken from the client but the guest's details:

1. `resolveMembership(context.userId)` from `tickets.server.ts` → must be `member`, else `not_member`.
2. Load the event through `supabaseAdmin`: `guest_passes_allowed` false → `not_allowed`; `registration_mode = 'none'` → `event_closed`.
3. `resolveGuestEligibility(guestEmail)` from `guest-passes.server.ts` → `already_used` when the guest spent their one pilot pass (also covers "this address is a member").
4. Existing row for `(event_id, lower(email))` → `duplicate`.
5. Snapshot the inviting member (`members` by `auth_user_id`: `full_name`, `email`, `cst_recno`, `activity_state`) into the `inviting_member_*` columns.
6. Insert with `status = 'pending'` through `supabaseAdmin`, since the snapshot and status are server-owned. `tg_guest_pass_guard` remains the second line of defence; a trigger rejection maps to the matching reason rather than a raw error.
7. Notify Membership & Engagement.

Returns `{ outcome: "ok" | "duplicate" | "already_used" | "not_member" | "event_closed" | "not_allowed" | "error", passId?: string }`. Server-side errors are logged, never echoed to the browser.

A second read function, `listMyGuestPasses`, also auth-gated: resolves the caller's member record and returns `listGuestPassesForMember(memberId)` mapped to a small display DTO (no inviting-member PII beyond their own).

### Email to the coordinator

New template `guest-pass-request` in `src/lib/email-templates/`, registered in `registry.ts` with a fixed `to: "office@coachingfederation.ch"` so it can never be addressed elsewhere. Body: inviting member name and email, guest name and email, event title and date, and a note that the request is pending review. Sent with `sendTemplateEmail` and idempotency key `guest-pass-request-<rowId>`; the call is wrapped so a delivery failure is logged and the request still succeeds.

### UI

- New `src/components/events/GuestPassPanel.tsx`, rendered from `EventDetail.tsx` next to `EventRegistrationPanel`, gated on `getEventTicketing(...).guestPassesAllowed` (already exposed in step 1) plus the signed-in membership state, which the page can read with the existing `getMyMembershipState` / `getMyRegistrationIdentity` pattern. The member's ICF number comes from a small addition to the identity read.
- New `src/components/member/GuestPassesCard.tsx`, rendered in `MemberHome.tsx` under the existing card rhythm, reading `listMyGuestPasses` through TanStack Query.
- Styling reuses the existing panel/card classes and design-system tokens; no new colours or spacing values.

### Translations

Member Area labels go in `src/i18n/locales/<lang>/cms.json` for all four languages, as asked. The panel on the public event page reads from the public `events.json` namespace instead, because that page uses the public `useI18n` provider and cannot see the CMS bundle — same four languages, no English-only strings either way. Flagging the split since the brief named `cms.json` for everything.

## Out of scope here

Approval / decline screen for Membership & Engagement, the comped registration created on approval, and any email to the guest — all step 3.
