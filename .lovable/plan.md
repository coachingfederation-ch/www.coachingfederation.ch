# Show members-only events publicly, restrict only registration

## What I found (verified against the live database)

Published members-only events exist (e.g. the Townhall, the Leadership Team
Meetup, the monthly Open Board Call). They are missing from `/events` because
the database read rule for visitors is:

```text
public read published events -> status = published AND is_internal = false
members read published internal events -> requires an explicit "may view
internal events" permission, checked against the signed-in account
```

The public events pages always read through the anonymous connection, even when
a member is signed in, so the second rule never applies on those pages. That is
why a signed-in member sees no members-only events either. This rule was
tightened earlier in response to a security finding; it is the single cause.

Who may actually register is enforced separately and correctly, in the
registration code and a database guard: `rsvp_members` requires an active
membership, `rsvp_invited` requires an invitation.

## The change

1. Replace the visitor read rule so every published event is readable,
   regardless of the members-only marker. The separate members rule becomes
   redundant and is removed.
2. Nothing changes about registration: members-only events keep asking for an
   active membership, invited-only events keep requiring an invitation, and the
   "Members only" tag stays on the card and the detail page.
3. The public subscribable calendar feed currently skips members-only events.
   Since these events become publicly listed, the skip is dropped so the feed
   matches the website. Say the word if you would rather keep them out of the
   feed.

## What stays protected

- Draft events remain invisible to visitors.
- The online meeting link is only shown on the event page to someone who is
  registered, and is sent in the confirmation email — unchanged.
- Registration itself stays gated exactly as today.

## Risk to be aware of

The event description is public text. If a members-only event's description
contains a joining link or internal detail, it becomes publicly readable once
the event is published. Worth a quick pass over the internal events currently
published before this goes live.

## Technical notes

- Migration on `public.events`: drop the policies
  `public read published events` and `members read published internal events`;
  create one SELECT policy for `anon` and `authenticated` with
  `USING (status = 'published')`. The `events_public` view is
  `security_invoker`, so this is the only place the filter lives. No column,
  table or grant changes.
- `src/lib/events-feed.server.ts`: remove `.neq("is_internal", true)`.
- No changes to `src/pages/Events.tsx` (its Audience facet already handles both
  values), `EventDetail.tsx`, `MemberHome.tsx`, `tickets.server.ts`, or the
  `tg_event_registration_guard` trigger.
- The security finding `events_internal_flag_not_enforced` will resurface on the
  next scan; it should be dismissed as accepted, since "members only" is defined
  here as a registration restriction, not a visibility restriction. Documented
  in `docs/events-and-ticketing.md`.

## PR note

- **Summary** — Makes every published event publicly visible again, including
  members-only ones, and keeps membership enforcement where it belongs: at
  registration.
- **Changes** — Backend: one migration replacing two event read policies with a
  single published-only policy; calendar feed no longer excludes members-only
  events. Docs: visibility-vs-registration rule recorded.
- **Backend / schema changes** — One migration, policies only. No columns,
  tables, grants or data touched.
- **Testing & verification** — `/events` signed out, signed in as a member and
  as staff: members-only events listed with the badge, Audience filter working;
  detail page reachable signed out; registration on an `rsvp_members` event
  refused without an active membership and accepted with one; `rsvp_invited`
  refused without an invitation; drafts still invisible; ICS feed contains the
  events.
- **Risks & rollback** — Blast radius is event visibility only. Rollback is
  re-creating the two previous policies. Internal descriptions become public —
  review published internal events first.
- **Follow-ups / known debt** — If a truly private event type is ever needed, it
  should be an explicit third status (e.g. unlisted) rather than reusing the
  members-only marker.
