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

Sign-in supports exactly two shapes, and the difference is deliberate:

- **Internal administrator** — an ordinary auth account holding `admin`, with
  **no** row in `members`. Chapter staff who administer the system are not
  necessarily ICF members, so requiring an imported member record for them
  would be wrong. `landingPath` sends them straight to the staff CMS.
- **Claimed member** — an account bound to an imported member record through
  `members.auth_user_id`, optionally carrying the additive `editor` grant.

Every **non-admin** privileged role still requires that claim linkage: the
`user_roles` insert policy grants `editor` only when the target account already
holds `member`, so an internal account cannot be given CMS access without first
being claimed. The admin Roles screen therefore lists internal accounts
read-only, purely for visibility.

Roles live in `public.user_roles` — one row per (user, role) — and never on a
profile record. Storing a role on a user-editable row is a privilege-escalation
bug waiting to happen, so `user_roles` has **no insert or update policy at
all**: roles can only be changed with the service role.

| Role        | Can do                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `admin`     | Everything, including roles, operational structure, integration and cutover. |
| `editor`    | Full Insights CMS: publish, schedule, edit anyone's article. Manages events. |
| `organizer` | Events only. Lands on `/manage/events`; has no access to `/articles`.        |
| `member`    | Edit and publish their own directory profile.                                |
| `user`      | Signed in with no privileges.                                                |

Roles are additive: a member who is assigned to an operational project is
granted `editor` automatically, and keeps the Member Area alongside the CMS.
`src/lib/role-model.ts` is the single source for role names, staff membership
and the post-login `landingPath`.

RLS calls the security-definer helpers `has_role(uid, role)`, `is_editor(uid)`
and `is_staff(uid)`. They are `security definer` so that policies can read
`user_roles` without recursing into that table's own policies.

They live in the **`private` schema**, not `public`. `security definer` plus
`EXECUTE` for `authenticated` is exactly what a policy needs, but in `public`
it also publishes them as PostgREST RPC endpoints, letting any signed-in user
ask whether an arbitrary account is an admin. Moving them out removes the
endpoint while leaving policies untouched (`ALTER FUNCTION ... SET SCHEMA`
preserves the OID that policies are bound to).

Consequence for application code: **do not call these over RPC.** Server
functions gate themselves with `assertStaff` / `assertAdmin` / `assertEditor`
from `src/lib/authz.ts`, which read `user_roles` through the caller's own
RLS-scoped client.

Role boundaries are enforced by policy, not by the UI. Hiding a button is a
courtesy; the article, event and member policies are what actually refuse the
write. The former `contributor` role has been removed entirely — from the enum,
the policies and the TypeScript — so do not reintroduce it in new code.

## Members are bound by ID, never by email

**A member is linked to an auth account only through `members.auth_user_id`.**
Email equality is never sufficient. ICF member records and Supabase accounts
can share an address without belonging to the same person, and email is
mutable on both sides — matching on it would hand one person's professional
profile to another. Every ownership check
(`member_owns_profile`, `member_owns_storage_folder`) resolves through
`auth_user_id`.

## The claim flow

Claiming is how a member gets that binding. It is **fully built and
deliberately closed** — it stays gated until the LIVE cutover, and the database
enforces the gate: `tg_integration_config_guard` raises an exception if
`account_claim_enabled` is set while the system is in TEST mode or has no
recorded cutover.

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
