# Plan: "Organizer Read-Only" role

## What you get
A new role, **Organizer (Read-Only)**, that Super Admins can assign on the Roles screen. People with it:
- Open the staff area and land on Events and Forms, like an Organizer.
- See **all** events (drafts, published, cancelled, invite-only), their details, registrations, waitlist, invitations, forms and answers, check-in status, and CCE info.
- Can **view and download** attendee lists (CSV), logged and rate-limited like other member-data access.
- Cannot create, edit, duplicate, publish, cancel, delete, check people in, send invitations, or change forms. Edit buttons are hidden or disabled with a short "Read-only access" note.

## How it works (in plain words)
- Saving is blocked on the server and in the database, not just by hiding buttons, so the role is truly read-only even if someone tries a direct link.
- Holding both Organizer and Read-Only still gives normal Organizer rights (roles add up).

## Technical details
- **Database migration**: add `organizer_readonly` to the `app_role` enum (separate migration, since new enum values can't be used in the same transaction). Second migration: add `private.is_event_viewer()` (security definer: admin/editor/organizer_readonly) and additive **SELECT-only** RLS policies on `events`, `event_registrations`, `event_waitlist_entries`, `event_invitations`, `event_ticket_tiers`, `event_forms`, `event_form_questions`, `event_form_responses`, `event_hosts`, `event_cce_*`, `event_attendance_*`, `form_templates`, plus matching `GRANT SELECT` where missing. No INSERT/UPDATE/DELETE policies.
- **Role model** (`src/lib/role-model.ts`): new `AppRole`, add to `STAFF_ROLES` and `MANAGED_ROLES`, new `isEventViewer` / `canEditEvents` flags in `RoleSet`.
- **Guards**: `assertEventViewer()` in `src/lib/authz.ts` for read server functions (list, detail, registrations, exports); write functions keep `assertOrganizer()` so they reject read-only callers. `EVENT_ROLES` route access and `fallbackFor` in `staff-guard.ts` include the new role; Shell nav shows Events/Forms.
- **UI**: event editor, check-in, forms builder and invitations read a `readOnly` flag and disable inputs/actions; attendee export stays enabled and goes through `guardMemberAccess` + `logMemberAccess`.
- **Roles screen**: label/description in EN/DE/FR/IT (`cms.json`), RoleDetailPanel entry.
- **Tests**: role-model test (read-only is staff, not organizer-capable); authz test that write guards reject `organizer_readonly`; DB access-contract check that the role can SELECT but not UPDATE an event.
- **Docs**: `docs/` roles/events pages and `AGENTS.md` rule.

## PR note
- **Summary**: Adds a view-only Organizer role with access to all events and attendee downloads, enforced by RLS and server guards.
- **Changes**: UI (read-only states, nav, Roles screen labels), server guards, role model, translations, docs.
- **Backend / Schema**: new enum value; new helper function; SELECT-only RLS policies on event/form tables. No data changes.
- **Testing**: unit tests above; browser check as a test account holding only the new role (view, export, edit blocked); regression check as Organizer.
- **Risks & Rollback**: additive only. Reverting code leaves an unused enum value and harmless read policies; revoke the role to remove access.
- **Follow-ups**: optional per-event scoping later if "all events" proves too broad.
