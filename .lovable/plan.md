# "Join community" button in the Member Area

Members already see their local communities on `/member` with a link to the community page and a contact email. Add a one-click way to register interest: a **Join community** button that emails the community's leads with the member's name, email and a short note that they'd like to join.

## What the member sees

- Each community card gets a primary **Join community** button next to the existing "View community" / "Contact the community" links.
- Clicking it sends the interest email immediately (no form). The button then switches to a confirmed state ("Request sent — the community leads will be in touch"), disabled for the rest of the session.
- Failures show a short inline error with a retry.
- A member who already sent a request for that community in the last 30 days sees the confirmed state instead of the button, so leads don't get duplicates.

## What the leads receive

One app email per community lead, using the chapter's existing email system and brand template style:

- Subject: "New member interested in joining <community name>"
- Body: member's name, their email as a `mailto:` reply link, their selected regions, and the community name.
- Recipients are resolved **server-side** from the community's lead assignments. All assigned leads receive it regardless of their public-contact opt-in — this is an internal chapter notification, not a public disclosure, and no lead address is ever returned to the browser. When a community has no lead with an address, the mail goes to the community's own `contact_email`, and finally to `office@coachingfederation.ch`.
- Localised in DE / FR / IT / EN, following the existing email copy files; the email is written in the member's interface language.

## Technical notes

- **New table** `community_join_requests` (member id, community project id, created_at) with RLS: a member may insert and read only their own rows; staff/admin may read all. GRANTs for `authenticated` and `service_role` in the same migration. This backs the 30-day duplicate guard and gives community leads a record in the database, not just in a mailbox.
- **New server function pair** `src/lib/community-join.functions.ts` (thin `createServerFn` wrapper with `requireSupabaseAuth`) and `src/lib/community-join.server.ts`:
  - validates the caller is a claimed member,
  - checks the community actually covers one of the member's regions,
  - enforces the 30-day guard and the shared `checkRateLimit` helper,
  - resolves lead addresses with `supabaseAdmin`,
  - inserts the request row and sends the emails through `sendTemplateEmail` with an idempotency key derived from the request row id.
- **New email template** `src/lib/email-templates/community-join-interest.tsx` plus a `community-join-interest-copy.ts` with the four locales, registered in `src/lib/email-templates/registry.ts`.
- **UI**: `src/components/member/MemberHome.tsx` gains the button and its mutation state; `loadMemberHome` additionally returns `alreadyRequested` per community so the confirmed state survives a reload. New i18n keys under `member.home.communities.join.*` in `cms.json` for all four locales.
- No change to how lead emails are exposed publicly — the opt-in rule in `member-home.server.ts` stays exactly as it is.

## PR note

**Summary** — Adds a "Join community" button to the community cards in the Member Area that records the member's interest and notifies the community leads by email.

**Changes**
- UI: join button, sent/error states, and per-community `alreadyRequested` flag on `/member`.
- i18n: `member.home.communities.join.*` in DE/FR/IT/EN plus the email copy file.
- Backend: `community_join_requests` table with RLS and grants; authenticated server function that validates, rate-limits, records and sends; new app email template registered in the template registry.

**Backend / schema changes** — One new table (`community_join_requests`) with RLS policies and grants. No changes to existing tables.

**Testing & verification** — Sign in as a member with regions set, press the button on a community card, confirm the row is written, the email reaches the lead addresses, the button locks into its sent state, and a second press within 30 days is refused. Check a community with no leads (falls back to the community address, then the office address), a member with no regions (no cards, nothing to press), and mobile width plus keyboard focus order.

**Risks & rollback** — Low: additive table, one new server function, one new template, one button. Rollback by removing the button; the table can stay harmlessly.

**Follow-ups** — Consider a staff view listing pending join requests per community, and an optional free-text message from the member.
