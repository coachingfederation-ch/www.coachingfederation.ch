# Fix: cannot save an event with the invite-only registration mode

## What is happening

When the invite-only mode is chosen in the event editor, saving fails with an
"Invalid input" error on `registration_mode`. The rejected list in the message
(`none`, `rsvp`, `rsvp_members`, `rsvp_tickets`) is the giveaway: it is missing
`rsvp_invited`.

Verified in the code:

- `src/lib/events-admin.functions.ts:97` validates
  `z.enum(["none","rsvp","rsvp_members","rsvp_tickets"])` — the invite-only
  value was never added when that mode was built.
- The database enum already contains `rsvp_invited`
  (`src/integrations/supabase/types.ts:4399`), and the editor UI and the
  event page already handle the mode.

So the block is purely the server-side input validator for create/update.

## The fix

- Add `rsvp_invited` to the `registration_mode` enum in the event input schema
  in `src/lib/events-admin.functions.ts`, keeping the order aligned with the
  editor dropdown.
- Re-check the same file's related paths so the new mode behaves sensibly:
  the staff "add attendee" path (line ~828/853) treats anything that is not
  `none` as registerable and only attaches a tier for `rsvp_tickets`, which is
  already correct for invite-only.
- No migration, no schema change, no UI change.

## PR note

- **Summary** — The invite-only registration mode could not be saved because
  the server input validator still listed only the four older modes; adds the
  missing value.
- **Changes** — Backend: one zod enum in `src/lib/events-admin.functions.ts`.
- **Backend / schema changes** — None. The database enum already has the value.
- **Testing & verification** — Save a draft event in each of the five modes;
  switch an existing event to invite-only and back; confirm the invitations
  section appears and the public panel still gates on the guest list.
- **Risks & rollback** — Minimal; single-line revert.
- **Follow-ups / known debt** — Worth deriving the validator from the generated
  database enum type so a new mode cannot drift out of sync again.
