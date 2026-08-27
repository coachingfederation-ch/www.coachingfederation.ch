# Guest Passes — Step 1: data layer, M&E role, event toggle

Foundation only. No request form, no approval screen, no emails — those come in the next two steps.

## What this delivers

- A new staff capability "Membership & Engagement" that can be granted to an account from the Roles screen.
- A per-event switch: "Allow ICF members to request a free Guest Pass for a non-member guest to this event."
- A guest-pass record store with the pilot rule enforced in the database: one pass per guest, ever.

## 1. Role: Membership & Engagement

- Add `membership` to the `app_role` enum in the database, and to `AppRole`, `MANAGED_ROLES`, `GRANTABLE_ROLES` in `src/lib/role-model.ts`.
- Add `isMembership: admin || administrator || membership` to `RoleSet`, `toRoleSet`, `EMPTY_ROLES`.
- Deliberately **not** added to `STAFF_ROLES`: holding it alone must not open the whole CMS. (Consequence: until step 2 adds a screen, someone holding only this grant still lands on `/no-access` — expected at this stage.)
- Add it to the rights checklist in `src/components/cms/RoleDetailPanel.tsx` and the label map in `src/lib/roles.functions.ts`, plus `membershipBadge` / `membershipDesc` strings in `cms.json` for en, de, fr, it.
- Because Postgres cannot add an enum value and use it in the same transaction, this ships as **two migrations**: (1) `ALTER TYPE app_role ADD VALUE 'membership'`, (2) everything that references it (guest-pass table, policies, trigger).

## 2. Event toggle `guest_passes_allowed`

- Column on `events`, `boolean not null default false`.
- `src/lib/events-admin.functions.ts`: add to `EDIT_COLUMNS` (not `LIST_COLUMNS`), to the `eventInput` schema as `z.boolean().default(false)`, to `normalize()`, and to the field copy block in `generateEventOccurrences` so recurring occurrences inherit it.
- Toggle in the registration-settings block of `src/components/cms/EventEditorSections.tsx`, with the help text above in all four languages.
- Add the column to the `events_public` view and read it in `loadEventTicketing` (`src/lib/tickets.server.ts`), exposing `guestPassesAllowed` on the returned `EventTicketing` so step 2's member UI can branch on it.

## 3. Table `guest_passes`

Columns exactly as specified: event and inviting-member references, an audit snapshot of the inviting member (name, email, ICF number, status), guest identity and context fields, `status` (`pending | approved | declined | registered | cancelled | attended`), decision fields, `registration_id`, follow-up fields, timestamps with an `updated_at` trigger.

Indexes: unique `(event_id, lower(guest_email))`, plus `lower(guest_email)`, `event_id`, `status`.

## 4. Access rules

- Members: insert only a row naming their own member record, `status = 'pending'`; select only their own rows.
- `membership` / `admin` / `administrator`: read everything, update decision and follow-up columns.
- Community/project leaders: read-only on rows for events they manage, via the existing `private.event_is_managed_by`.
- Grants issued alongside the policies (`authenticated`, `service_role`), column-scoped so guest contact details are not reachable by other members.

## 5. Trigger `tg_guest_pass_guard`

On insert, refuse unless the inviting member is `active`, the event has the toggle on and `registration_mode <> 'none'`, the guest email has no earlier row in `approved | registered | attended`, and there is no duplicate for this event. Exception messages follow the platform's phrase-matching convention used by `failureReason`.

On update, freeze `status`, `decision_*` and `registration_id` for untrusted callers — only staff or the service-role server path may move them.

## 6. `src/lib/guest-passes.server.ts`

Server-only module plus a client-safe `guest-passes.ts` for shared types:

- `resolveGuestEligibility(guestEmail)` — has this guest already used a pass?
- `listGuestPassesForMember(memberId)`
- `listGuestPassesForEvent(eventId)` (staff)

## PR note

**Summary** — Adds the Guest Pass data layer: a `membership` staff role, a per-event `guest_passes_allowed` toggle, and a `guest_passes` table whose one-pass-per-guest pilot rule is enforced by a database trigger. No user-facing guest-pass flow yet.

**Changes** — Role model + roles UI labels and locale strings; event editor toggle and admin/public event read paths; new server module for guest-pass reads.

**Backend / schema** — Migration A: `app_role` enum value. Migration B: `events.guest_passes_allowed`, `events_public` view update, `guest_passes` table + grants + RLS + indexes, `tg_guest_pass_guard`, `updated_at` trigger.

**Testing & verification** — Apply migrations; confirm the toggle round-trips through the editor and is inherited by generated occurrences; confirm a member insert succeeds once and is rejected on a second event for the same guest email, on an event with the toggle off, and when the member is not active; confirm a member cannot update `status`; confirm a `membership`-only account can read all rows and an unrelated member cannot.

**Risks & rollback** — Additive only; the toggle defaults to false so no existing event changes behaviour. Rollback drops the table and column; the enum value stays (Postgres cannot drop enum values), which is harmless.

**Follow-ups** — Request form and eligibility UI (step 2); approval screen, comped-seat creation, and emails (step 3). The `membership` role has no CMS destination until step 2, so grant it only once that screen exists.
