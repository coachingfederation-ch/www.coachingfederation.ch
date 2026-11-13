# Invite-only events: hidden from the public

## Goal
Events set to "Invited guests only" or "Invited guests (incl. non-members)" stop appearing on the public website. They are visible only to:
- **Signed-in active members** (grace included) — in the event list and on the event page.
- **Invited people** — through the personal link in their invitation email (`/events/<slug>?invite=<token>`), member or not.

Everyone else (anonymous visitors, search engines, calendar subscribers, assistant) never sees them. A plain link without a valid invitation shows "Event not found" to non-members.

## What changes for users
- Public Events page, homepage, community pages, Europe/Swiss calendar feed, sitemap, newsletter generator and chapter assistant: invite-only events disappear.
- Signed-in members: Events page additionally shows invite-only events with an "Invite only" tag; registration stays limited to the guest list (unchanged).
- Invitees: the email link opens the full event page and the existing accept/decline panel, without signing in.
- Staff CMS: unchanged.
- Page title/OG for invite-only events: generic, `noindex`, so shared links do not leak details.

## Technical details
- **Migration**: recreate the `events_public` view adding `registration_mode NOT IN ('rsvp_invited','rsvp_invited_open')`; tighten the base `events` "public read published events" policy so `anon` cannot read invite-only rows directly (authenticated staff/owner policies untouched). Update `supabase/baseline`.
- **New server functions** (`src/lib/events.functions.ts`):
  - `listMemberInviteOnlyEvents` — `requireSupabaseAuth`, confirms active/grace member link via existing helper, reads via admin client after the check, returns the same `PublicEvent` shape + translations.
  - `getInviteOnlyEvent({ slug, token? })` — public, rate-limited (`checkRateLimit`). Returns the event only if the token hashes to a valid `event_invitations` row for that event; otherwise null. Outcome-neutral.
  - `getMemberEvent({ slug })` — `requireSupabaseAuth` + member check.
- **Event page** (`src/routes/events.$slug.tsx`): loader uses `getPublicEvent`; if null and `?invite` present, `getInviteOnlyEvent`. If still null, client-side after hydration tries `getMemberEvent` (session lives in the browser) before showing not-found. `head()` sets `robots: noindex` for invite-only.
- **Events list** (`events.index.tsx`): after hydration, signed-in members merge `listMemberInviteOnlyEvents` into upcoming; add localized "Invite only" tag (EN/DE/FR/IT).
- Audit remaining direct `events` reads used publicly (`events-feed.server.ts`, `event-calendar.server.ts`, `tickets.server.ts`, `assistant/tools.server.ts`, `newsletter-generation.server.ts`, `chapter-overview.server.ts`) and filter invite-only where they surface to non-members.
- Tests: rule test that invite-only modes are excluded from public lists and that a token for another event is rejected.
- Docs: `docs/events-and-ticketing.md`, `docs/public-directory`-style note in `docs/architecture.md`; AGENTS rule.

## PR note
- **Summary**: Invite-only events are no longer public; only signed-in members or holders of a valid invitation link can view them.
- **Changes**: UI (event page, list tag), server (3 functions, filters), schema (view + anon policy).
- **Backend/Schema**: `events_public` view recreated; anon SELECT policy on `events` narrowed.
- **Testing**: unit tests; browser check signed-out (hidden), member (visible), invitation link (visible), wrong token (not found).
- **Risks & Rollback**: already-shared plain links to invite-only events stop working for non-members. Revert by restoring the previous view/policy; code revert is safe with migration left in place (only hides more).
- **Follow-ups**: none known.
