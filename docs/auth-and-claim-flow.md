# Authentication, roles and account claiming

## Two separate authenticated areas

There is no shared "dashboard". A signed-in user lands in exactly one of two
places, and the two areas have no shared navigation:

- **Staff CMS** (`/articles`, `/manage/events`, `/members`, `/integration`, …)
  for admins, editors and organizers.
- **Member Area** (`/my-profile`) for members.

`src/routes/auth.callback.tsx` performs this routing after sign-in by reading
the user's roles. A user with neither kind of role is sent to `/no-access`
rather than being dropped into an empty shell.

## The role model

### Two kinds of account

Rights can only be granted to one of two kinds of account:

- **Internal staff account** — an auth account registered through the staff
  invite screen (a row in `internal_accounts`), with **no** row in `members`.
  Chapter staff are not necessarily ICF members, so no imported member record
  is required.
- **Claimed member** — an account bound to an imported member record through
  `members.auth_user_id`.

The database refuses a grant on any other account. Both kinds are managed on
the Roles screen (`/roles`, Super Admin only).

Roles live in `public.user_roles` — one row per (user, role) — and never on a
profile record. Role changes go through server functions guarded by
`authz.ts`; browsers cannot write `user_roles` directly.

### Roles

| Role            | Label in the app        | Can do                                                                                                                                                                 |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`         | Super Admin             | Everything, including Members, Integration and Roles. The only role that may publish its own article.                                                                  |
| `administrator` | Administrator           | Overview, Vocabularies, Coach Finder, Operational Structure, Europe Pulse, Governance, Chat insights, Assistant knowledge, Live chat, Guest passes, Member engagement. |
| `editor`        | Editor                  | Articles, Newsletters, Categories, Editorial signals, Member guides. Writes and edits any article; cannot publish their own.                                           |
| `publisher`     | Publisher               | Reviews and publishes articles (and Editorial signals). Cannot publish their own article.                                                                              |
| `organizer`     | Organizer               | Events only — their own events, enforced by RLS.                                                                                                                       |
| `membership`    | Membership & Engagement | Guest passes and Member engagement.                                                                                                                                    |
| `member`        | Member                  | Member Area and their own directory profile.                                                                                                                           |
| `user`          | (dormant)               | Nothing grants it; its policies remain but no UI surfaces it.                                                                                                          |

Roles are **additive grants**: a member who is also an editor keeps the Member
Area and gains the CMS on top. Joining an operational team no longer grants any
access. `src/lib/role-model.ts` is the single source for role names and the
post-login `landingPath`: members go to `/member`; an Administrator without
editorial rights to `/vocabularies`; an organizer-only account to
`/manage/events`; other staff to `/articles`; everyone else to `/no-access`.

### Insights CMS — functional assignment

✓ = can open the screen. Super Admin (`admin`) passes every guard and is omitted
from the columns. "Guard" is the route guard list in `src/lib/staff-guard.ts`;
the server functions behind each screen repeat the check with `authz.ts`, and
RLS is the final boundary.

| Screen                                                      | Address                     | Guard                  | Administrator | Editor | Publisher | Organizer | M&E |
| ----------------------------------------------------------- | --------------------------- | ---------------------- | :-----------: | :----: | :-------: | :-------: | :-: |
| Overview                                                    | `/manage`                   | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Articles (list, new, editor)                                | `/articles`, `/articles/*`  | `ARTICLE_ROLES`        |               |   ✓    |    ✓¹     |           |     |
| Newsletters                                                 | `/manage/newsletters`       | `ARTICLE_ROLES`        |               |   ✓    |    ✓¹     |           |     |
| Categories                                                  | `/articles/categories`      | `CATEGORY_ROLES`       |               |   ✓    |           |           |     |
| Editorial signals                                           | `/manage/editorial-signals` | `ARTICLE_ROLES`        |               |   ✓    |     ✓     |           |     |
| Member guides                                               | `/manage/guides`            | none (menu + RLS)²     |               |   ✓    |           |           |     |
| Events (list, new, editor, check-in, forms, reporting, CCE) | `/manage/events/*`          | `EVENT_ROLES`          |               |        |           |     ✓     |     |
| Guest passes                                                | `/manage/guest-passes`      | `MEMBERSHIP_ROLES`     |       ✓       |        |           |           |  ✓  |
| Member engagement                                           | `/manage/member-engagement` | `MEMBERSHIP_ROLES`     |       ✓       |        |           |           |  ✓  |
| Vocabularies                                                | `/vocabularies`             | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Coach Finder                                                | `/coach-finder`             | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Operational Structure                                       | `/operational-structure`    | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Europe Pulse                                                | `/manage/europe-pulse`      | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Governance                                                  | `/manage/governance`        | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Chat insights                                               | `/manage/chat-insights`     | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Assistant knowledge                                         | `/manage/knowledge`         | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Live chat                                                   | `/manage/live-chat`         | `PLATFORM_ADMIN_ROLES` |       ✓       |        |           |           |     |
| Members                                                     | `/members`, `/members/$id`  | `ADMIN_ONLY`           |               |        |           |           |     |
| Integration                                                 | `/integration`              | `ADMIN_ONLY`           |               |        |           |           |     |
| Roles                                                       | `/roles`                    | `ADMIN_ONLY`           |               |        |           |           |     |

¹ The route admits publishers, but the side menu shows the link to editors only
(see `docs/tech-debt.md`).
² The route has no `requireStaffAccess` guard; the menu entry is editor-only and
writes are editor-gated in RLS.

**Article actions**

- **Write / edit** — editors (any article) and Super Admin.
- **Submit for review** — the author moves the article to `review`; eligible
  publishers receive a review-request email.
- **Publish / schedule** — publishers, editors with publishing rights, and
  Super Admin; the "Released by" column records who did it.
- **Publish your own article** — Super Admin only, enforced server-side
  (see `docs/article-publishing.md`).

### Database helpers

RLS calls the security-definer helpers in the **`private` schema** —
`has_role`, `is_editor`, `is_staff`, `is_platform_admin`,
`is_membership_staff`, `is_article_publisher`, `is_internal_account`. They are
`security definer` so policies can read `user_roles` without recursion, and
they live outside `public` so they are not exposed as RPC endpoints. Never
inline a `user_roles` subquery in a policy.

Application code does **not** call these over RPC. Server functions gate
themselves with the `authz.ts` guards — `assertAdmin` (Super Admin),
`assertPlatformAdmin`, `assertEditor`, `assertOrganizer`, `assertMembership`,
`assertStaff`, `assertRole`, `assertAnyRole` — which read `user_roles` through
the caller's RLS-scoped client.

Role boundaries are enforced by policy, not by the UI. The former
`contributor` role has been removed entirely — do not reintroduce it.

## Members are bound by ID, never by email

**A member is linked to an auth account only through `members.auth_user_id`.**
Email equality is never sufficient. ICF member records and Supabase accounts
can share an address without belonging to the same person, and email is
mutable on both sides — matching on it would hand one person's professional
profile to another. Every ownership check
(`member_owns_profile`, `member_owns_storage_folder`) resolves through
`auth_user_id`.

## The claim flow

Claiming is how a member gets that binding. It is **invitation only**: there is
no public request form, and the former `/claim` page was removed deliberately.
A claim always starts from a token issued by staff (member detail page) or by
the claim campaign, so the only public surface is `/claim/$token`.

It stays gated until the LIVE cutover, and the database enforces the gate:
`tg_integration_config_guard` raises an exception if `account_claim_enabled` is
set while the system is in TEST mode or has no recorded cutover.

Tokens are custom rather than Supabase magic links, because claiming must bind
a _specific_ ICF member record, which the built-in flow has no concept of.

1. A token is generated for a member and delivered as a link. The row in
   `member_profile_links` stores only a **hash** of it — a database leak does
   not yield usable tokens.
2. The member opens `/claim/$token`. The server hashes the presented token and
   looks up the row.
3. Validation, all server-side in `member-claim.server.ts`: not expired, not
   already consumed, attempt count under the limit. Every attempt is recorded,
   so guessing is rate-limited and visible.
4. On success the member signs in or signs up, `members.auth_user_id` is set,
   the `member` role is granted, and the token is marked consumed. Single use.

While claiming is closed, staff can still issue a token manually from the
member detail page. This is how the flow was verified end to end without
opening it to the public.

## Email is currently inert

No email is delivered. `member-email.server.ts` records every intended send in
`member_email_log` — recipient, template, mode — and drops it. In TEST mode the
database _forces_ `emails_suppressed` to true, so it is not possible to
accidentally email real ICF members while rehearsing.

Enabling delivery requires configuring an email domain and then wiring the
transport in that one module. The log table exists so that, once transport is
live, there is already a record of what would have been sent.

## Adding a protected server function

```ts
export const doThing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(schema.parse)
  .handler(async ({ data, context }) => {
    // context.supabase runs as the user, with RLS
  });
```

Two traps:

- **Never call a protected function from a public route's loader.** SSR and
  prerender have no session, so it throws `Unauthorized` and fails the build.
  Call it from the component via `useServerFn`, or put the route under a gated
  layout.
- Client-side `functionMiddleware` in `src/start.ts` attaches the bearer token.
  Append to that array; do not replace it.

## Auth email links go through our own domain

Auth emails never contain the backend provider's host. The webhook
(`src/routes/lovable/email/auth/webhook.ts`) rewrites every `confirmationUrl`
into `https://new.coachingfederation.ch/auth/confirm?token=…&type=…&next=…`.

`src/routes/auth.confirm.ts` is a public server route that validates the action
type, keeps `next` same-origin, rebuilds the provider verification address from
`SUPABASE_URL` server-side, and 302s to it. Token issuing, validation and
expiry are unchanged — only the address the member clicks moved. If the
incoming URL cannot be parsed, the original link is sent unchanged so an auth
email can never go out broken.

## When ICF Global reports a new email address

ICF Global masters contact data, but it is never allowed to move the address an
account signs in with: an address handed to us by a third system has not been
proven to belong to the person holding the account. So the sync splits the two.

1. The feed value is written to `members.email` (contact data) as usual.
2. For **claimed** records whose feed address no longer matches the auth
   account's address, the sync parks it: `members.pending_email`,
   `pending_email_since` and `email_change_state`
   (`none` | `pending` | `sent` | `blocked`). `blocked` means another claimed
   account already signs in with that address — staff have to resolve the
   duplicate. Detection lives in `src/lib/member-email-change.server.ts` and is
   called from `runMemberSync`; a failure there is logged as a warning and
   never fails the run.
3. The member sees a notice in the Member Area
   (`src/components/member/EmailChangeNotice.tsx`) and presses one button.
   `startEmailChangeConfirmation` (`src/lib/account-security.functions.ts`)
   calls `auth.updateUser({ email })` **through the member's own session**, so
   the provider sends its confirmation link to the new address. Nothing moves
   until they click it. That mail is the `email_change` template, already
   branded and already rewritten onto our own domain by the webhook above.
4. Once the account actually signs in with the new address, the pending state
   is cleared the next time it is read (sync, member notice, or staff panel).

No admin can perform step 3 for someone — that would defeat the confirmation.

### What staff can do

`src/components/cms/MemberSignInHealthPanel.tsx` on the member detail page shows
the account's own facts (sign-in address, whether it is confirmed, last sign-in,
creation date, any pending address change) and offers one action: send a
password reset link. The link always goes to the address the **account** holds —
never one typed in by staff — so the control can restore access but can never
redirect it. It shares the public form's per-address rate-limit buckets and
writes a `member_password_reset_sent_by_staff` audit event.
