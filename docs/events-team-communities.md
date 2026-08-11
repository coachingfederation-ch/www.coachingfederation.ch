# Events, team and local communities

Three later features that share one idea: **staff maintain structured rows, the
public site renders a localized projection of them.** None of them introduce a
new pattern — they reuse translations, vocabularies and the view-first read
path described in the other documents.

## Events

Staff manage events at `/manage/events`; the public sees `/events` and
`/events/$slug`.

- Publishing is guarded in the database (`tg_events_publish_guard`): a published
  event must have a title, a slug and a start time, and cannot end before it
  starts.
- `tg_event_registration_guard` is the whole seat policy — it locks the event
  row, re-counts confirmed seats and refuses when the event is unpublished,
  closed, full, or requires an account. Capacity is therefore safe under
  concurrent registrations; do not re-implement the check in TypeScript.
- Registration modes, ticket tiers, member pricing, Stripe checkout,
  confirmation emails and the staff cancellation/refund flow are documented in
  `events-and-ticketing.md`.
- Event copy is translated per locale in `event_translations`, with the same
  `manually_edited` protection as articles.

## Operational structure and the team page

`op_projects` (a project or committee), `op_project_roles` (roles within it) and
`op_assignments` (member ↔ project ↔ role) are edited by admins at
`/operational-structure`.

- Assigning a member grants them the `editor` role automatically; removing the
  last assignment prompts to revoke it. Roles are still only written with the
  service role.
- The public team page `/team` renders a hexagonal honeycomb from
  `team_directory_public`, filtered by localized project pills, with a detail
  modal. Members appear because they hold an assignment — **not** because their
  coach profile is published, which is why that view is built on
  `private.team_directory_rows()`.
- The translatable "Team role description" (`team_bio`, 2000 chars) is edited by
  the member in `/my-profile` and is only shown to accounts holding `editor`.

## Local communities

A community is an `op_project` with `is_community = true`, plus description,
cadence, contact email, signup URL and `language_slugs` (resolved against
`cf_languages`). One community can be flagged `is_featured_community`; a trigger
enforces that only one is.

- Public routes: `/communities` and `/communities/$slug`, with the
  `CommunityRing` member layout.
- The About page shows the featured community through `CommunitiesPreview`.
- Description and cadence are translated in the CMS `CommunityPanel`, using the
  same AI-assisted translation flow as articles and events.
