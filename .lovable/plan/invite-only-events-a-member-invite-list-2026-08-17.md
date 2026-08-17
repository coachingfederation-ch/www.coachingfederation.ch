# Invite-only events: a member invite list

A fifth registration mode, **RSVP (invited members only)**. Instead of waiting
for people to sign up, staff build the guest list first: pick active members in
the event editor, each one gets a personal invitation email with a private
link, and only those links open the registration form.

## How it behaves

```text
No registration (open)
RSVP (public)
RSVP (members)            [x] allow without a membership
RSVP (tickets)
RSVP (invited members)    <- new: guest list built in the editor, RSVP only
```

- The public event page shows the event as normal, but instead of a form it
  says the event is by invitation and points to the invitation email. No
  ticket tiers, no payment — invited RSVPs are always free.
- Opening the event with the personal link (`/events/<slug>?invite=<token>`)
  unlocks the form, pre-filled with the invited member's name and email, both
  read-only. The email always comes from the invitation, so a forwarded link
  cannot seat somebody else.
- The token is single use: once the invitee registers, the entry is marked
  accepted and the link stops working. Declining is also possible from the
  same screen and shows in the staff list.
- Capacity is still honoured; if the event is full the invited person sees
  the same "fully booked" message.

## Editor: "Invited members" section

Appears only for the new mode, under the registration section.

- **Add members** — a search box over active members (same eligibility source
  as the live-chat volunteer picker: `members` with an active membership),
  showing name and credential. Members already on the list are filtered out.
  Adding sends the invitation email immediately, in the member's own language.
- **The list** — name, email, status (invited / registered / declined /
  expired), when invited, and actions: re-send invitation, remove.
- **Counts** — invited / registered, next to the capacity figure.
- Removing someone who has already registered removes them from the list only;
  their registration is untouched and cancelled the normal way.

## Emails

A localized invitation modelled on the waitlist invitation
(`event-waitlist-invitation.tsx`): what the event is, when and where, the
personal registration button, and a note that the link is personal. Re-send
mints a fresh token and invalidates the old one. Registration then produces
the usual confirmation email with the calendar attachment — nothing new there.

## Technical notes

**Migration**
- New enum value `rsvp_invited` on `event_registration_mode` (added in its own
  statement before it is used).
- New table `public.event_invitations`: `event_id`, `member_id`, `user_id`,
  `full_name`, `email`, `locale`, `status`
  (`invited|registered|declined|revoked|expired`), `invite_token_hash`,
  `invited_at`, `invited_by`, `responded_at`, `registration_id`, timestamps.
  Unique on `(event_id, email)`.
- GRANTs: `SELECT/INSERT/UPDATE/DELETE` to `authenticated`, `ALL` to
  `service_role`; no `anon` grant — the public path reads only through the
  server, by token. RLS on, with policies scoped to event managers
  (`private.event_is_managed_by`) for staff reads/writes.
- `tg_event_registration_guard()` gains one rule: for `rsvp_invited`, an
  insert that is not written by the trusted server path is refused, and the
  tier/price branch is skipped (always free, like `rsvp`).
- `updated_at` trigger via the existing `tg_touch_updated_at`.

**Server**
- `src/lib/event-invitations.server.ts` — list, add (create + mail), re-send,
  revoke, `resolveInvitationToken(eventId, token)` (hashed lookup, status and
  expiry checked), `markInvitationRegistered`. Token minting and hashing copy
  the waitlist pattern (`randomBytes(32).toString("base64url")`, SHA-256 hash
  stored).
- `src/lib/event-invitations.functions.ts` — staff server fns behind
  `requireSupabaseAuth` plus an event-manager check; one public fn to resolve a
  token for the registration panel (rate-limited through
  `checkRateLimit`, outcome-neutral on a bad token).
- `src/lib/tickets.server.ts` — `submitRegistration` handles `rsvp_invited`:
  requires a valid invitation token, takes name/email from the invitation,
  ignores tiers and discounts, writes through `supabaseAdmin`, then marks the
  invitation registered.
- `src/lib/events.functions.ts` — accept the invitation token on the RSVP
  schema (the existing `inviteToken` field is reused; the server resolves it
  against the waitlist first, then invitations).
- `src/lib/email-templates/event-invitation.tsx` and
  `event-invitation-copy.ts` (EN/DE/FR/IT), registered in `registry.ts`.

**UI**
- `src/components/cms/EventInvitationsSection.tsx` — member search, list,
  re-send/remove; rendered from `EventEditorSections.tsx` only for the new
  mode, alongside the existing conditional tickets section.
- `src/components/events/EventRegistrationPanel.tsx` — a new derived state for
  the invited mode: locked notice without a token, locked read-only form with
  the invitation's name/email when a token resolves, plus a "can't make it"
  decline action.
- `src/lib/events.ts` / `src/pages/Events.tsx` — treat `rsvp_invited` as a
  registration mode for the card badge.
- New strings in `src/i18n/locales/{en,de,fr,it}/{events,cms}.json`.

## PR note

- **Summary** — Adds an invitation-based registration mode so organisers can
  build a guest list of active members up front; only members holding a
  personal invitation link can RSVP.
- **Changes** — UI: new mode option, "Invited members" editor section with
  member picker and status list, invitation-aware public registration panel.
  Backend: `event_invitations` table with manager-scoped RLS, invitation
  server module, token-gated registration path, localized invitation email.
  Content: new strings in four languages.
- **Backend / schema changes** — One migration: new enum value, new
  `event_invitations` table with grants, RLS and policies, updated
  registration guard trigger. No changes to existing rows.
- **Testing & verification** — Add a member and confirm the mail arrives in the
  member's language; register via the link and confirm the seat, confirmation
  email and status change; re-use the same link (must fail); forward the link
  and try another email (must fail); decline; re-send; remove; capacity full
  with an outstanding invitation; the public page without a token; other
  registration modes unchanged.
- **Risks & rollback** — Scope is event registration. Reverting the code is
  safe; the table and enum label can stay unused, but events set to
  `rsvp_invited` need to be moved back to another mode by hand.
- **Follow-ups / known debt** — Ticketed invite-only events and bulk import of
  invitees are deliberately out of scope; the picker is limited to active
  members, so external guests still go through public RSVP.
