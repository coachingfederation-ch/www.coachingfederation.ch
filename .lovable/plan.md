# "Invited guests" audience: invite-only events open to non-members

## What you get
The "Who can register" dropdown gets a fourth option:

```text
Anyone
Active members only
Invited members only            (as today: guest list limited to active members)
Invited guests (anyone on the list)   <- new
```

With the new option, the event behaves exactly like "Invited members only" (personal link, single use, the form is locked without it, decline possible, capacity honoured), except the guest list also accepts people who are not members:

- **Member search** still works as today.
- **Add a guest**: a small form with name, email, and language (DE, FR, IT, EN) to invite one non-member.
- **Bulk paste / CSV**: addresses matching an active member are invited as that member. With the new option, the other addresses are no longer skipped. They show as "Will be invited as a guest" in the preview. For CSVs with a name column next to the email, the name is used. Otherwise the part before "@" is used as a placeholder name, and the guest can correct it on the registration form.
- Guests get the same invitation email, in the chosen language (the event language for bulk-added guests).
- The list marks each row as **Member** or **Guest**.

"Invited members only" keeps refusing non-members, so existing events don't change.

## Technical details
- **Migration**: add enum value `rsvp_invited_open` to `event_registration_mode` in its own statement. Then update `tg_event_registration_guard()` so the new value is treated exactly like `rsvp_invited` (trusted server insert only, always free). `event_invitations.member_id` is already nullable, so the table needs no change.
- **Shared helper** `isInvitedMode(mode)` in `src/lib/events.ts`, used everywhere `rsvp_invited` is checked today: `EventRegistrationPanel.tsx`, `tickets.server.ts`, `event-invitations.server.ts`, `events-admin.functions.ts`, `manage.events.$id.tsx`, `EventWizard.tsx`, and `EventEditorSections.tsx` (invitations panel visibility).
- **Server** (`event-invitations.server.ts` / `.functions.ts`):
  - `addGuestInvitation({ eventId, fullName, email, locale })`. Refused unless the event mode is `rsvp_invited_open`. If the email belongs to an active member, it is linked as that member instead.
  - The bulk preview returns a `guests` list (email plus parsed name) when the mode is open.
  - `addBulkInvitations` accepts `guests[]` alongside `memberIds`, still capped at 500 in total.
  - Same manager check and the same duplicate rule (one invitation per email per event).
- **Parser**: `parseInviteList` also returns an email-to-name map when a CSV row has a name cell. Tests are extended for this.
- **UI**: a guest form plus Member/Guest labels in `EventInvitationsSection.tsx`, and the new option in the audience select.
- **Wording**: new strings in `cms.json` and `events.json` in EN/DE/FR/IT.
- **Docs**: update `docs/events-team-communities.md`.

## PR note
- **Summary**: A new "Invited guests" audience lets organisers add non-members to an invite-only guest list, one at a time or in bulk.
- **Changes**: UI has the new option, a guest form, Member/Guest labels, and bulk guest handling. Server has guest add and open-mode bulk. The parser picks up names. Translations and docs are updated.
- **Backend / Schema**: new enum value and an updated registration guard trigger. Existing rows are not touched.
- **Testing**: add a guest, receive the mail, register via the link, and confirm a reused link fails. Bulk mixed list in both invited modes. "Invited members only" still refuses non-members. Other modes unchanged. Parser tests.
- **Risks & rollback**: limited to invite-only registration. If the code is reverted, events set to the new mode must be moved back to another mode by hand. The enum value can stay unused.
- **Follow-ups**: none planned. Ticketed invite-only events remain out of scope.
