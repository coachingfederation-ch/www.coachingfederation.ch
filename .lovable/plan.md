# Member volunteering detail page

Add a destination for the Volunteering card on the Member Area landing page so members can explore why and how to volunteer, see open opportunities, and contact the Volunteering Director.

## What the member sees

New route `/volunteering` inside the existing `_member` gate (member role required, `ssr: false`). The page is rendered inside `MemberShell` and includes a back link to `/member`.

1. **Hero** — eyebrow, title and a short paragraph explaining that the chapter is built by volunteers.
2. **Open opportunities** — a tile grid of mock volunteer roles with a short description and a quote from a volunteer. The quotes are clearly placeholder copy; they will be replaced with real volunteer quotes once they are collected.
3. **Benefits of volunteering** — four benefit cards following the structure below:
   - **Free Stuff** — volunteer badges, free supervision sessions with Swiss supervisors paid by ICFS.
   - **Access** — deeper insights in volunteer-only sessions on AI, coaching insights, and being part of moving projects.
   - **Power** — lead projects and be recognized by ICFS for leading initiatives.
   - **Status** — build a reputation as a contributing and leading member of the ICF Switzerland Community.
4. **Book an onboarding session** — a list of upcoming events whose title contains "Volunteer onboarding" (case-insensitive). Each event links to its public detail page. If no onboarding event is published, the section shows a disabled "Coming soon" button.
5. **Contact the Volunteering Director** — the page looks up the Volunteering project (`op_projects` slug `volunteering`) and its assigned lead/co-lead. If a lead is assigned and has opted in to public contact, their name and email are shown. Otherwise it falls back to the project's `contact_email`, and finally to `office@coachingfederation.ch`. The email is rendered as a `mailto:` link.

## Routing and navigation

- New file: `src/routes/_member/volunteering.tsx` with `createFileRoute("/_member/volunteering")`, route-specific `head()` metadata, and a `robots: noindex` meta tag.
- Update `src/components/member/MemberHome.tsx` so the Volunteering card is no longer a disabled button; it now links to `/volunteering` with an active CTA.
- `MemberShell` already links home to `/member`, so no shell change is needed.

## Data

- Create a new authenticated server function pair:
  - `src/lib/volunteering-info.functions.ts` (thin `createServerFn` wrapper)
  - `src/lib/volunteering-info.server.ts` (query logic)
- The function uses `supabaseAdmin` and `requireSupabaseAuth` and returns:
  - Volunteering project name, `contact_email`, and any assigned lead/co-lead with name and opt-in email.
  - Upcoming onboarding events: events whose `title` matches `Volunteer onboarding` (case-insensitive), ordered by `starts_at`, limited to a small number.
- No new database tables or schema changes. The lookup is based on the existing `op_projects`, `op_project_roles`, `op_assignments`, and `events` tables. The Volunteering Director's data can be maintained through the existing Operational Structure editor; the code only reads it.

## Copy and i18n

- Add a new `member.volunteering` block in `src/i18n/locales/{en,de,fr,it}/cms.json` with keys for:
  - `title`, `eyebrow`, `intro`, `back`
  - `opportunities.title`, `opportunities.items[]` (title, description, quote, attribution)
  - `benefits.title`, `benefits.freeStuff.title`, `benefits.freeStuff.items[]`, etc.
  - `onboarding.title`, `onboarding.body`, `onboarding.cta`, `onboarding.soon`, `onboarding.empty`
  - `contact.title`, `contact.body`, `contact.name`, `contact.email`, `contact.fallback`, `contact.cta`
- Keep English as the source and provide German, French, and Italian translations following the existing style and terminology of the Member Area copy.

## Components and styling

- New component: `src/components/member/VolunteeringPage.tsx`.
- Uses the ICF design-system tokens and components: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, and `Link` from `@tanstack/react-router`.
- Keeps the same surface rhythm as the rest of the Member Area: bone base background, white cards, restrained borders, rounded-2xl corners.
- Uses the existing `useCms` hook for translations and the new `useServerFn` + `useQuery` pattern for the volunteering data.

## Out-of-scope / assumptions

- The volunteer quotes are mock placeholders and must be replaced with real quotes before the page is promoted beyond the member preview.
- The Volunteering Director is currently unassigned in the operational structure, so the contact block will fall back to the project email or `office@coachingfederation.ch`. The page is built to automatically reflect the real director once they are assigned in the Operational Structure editor.
- Volunteer onboarding events are identified by a case-insensitive title match. If the chapter later adds a dedicated event category or tag for these sessions, the server query can be updated in one place.

## PR note

**Summary** — Adds a `/volunteering` detail page in the Member Area that explains volunteer opportunities, highlights benefits, lists upcoming onboarding events, and surfaces the Volunteering Director's contact details from the operational structure.

**Changes**
- UI: new `VolunteeringPage` component and `/volunteering` route; Volunteering card on `/member` becomes an active link.
- i18n: `member.volunteering.*` keys in all four locales.
- Backend: new authenticated server function that reads the Volunteering project, its leads, and upcoming onboarding events from existing tables.

**Backend / schema changes** — None. Uses existing `op_projects`, `op_project_roles`, `op_assignments`, and `events` tables.

**Testing & verification** — Sign in as a member, navigate from `/member` to `/volunteering`, confirm all five sections render, check the onboarding block when no matching event is published, and verify the contact block falls back to the office email. Check mobile width and keyboard focus order.

**Risks & rollback** — Low blast radius: additive page plus one card link change. Revert by changing the Volunteering card link back to a disabled button and removing the route file.

**Follow-ups** — Replace mock volunteer quotes with real ones; assign a Volunteering Director in the Operational Structure editor; consider a dedicated event category or tag for onboarding sessions when the event pipeline supports it.
