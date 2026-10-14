## Technical details

**Backend (staged, applies when the draft is accepted, additive only)**
- Add the enum value `advertiser` to `app_role`. It stays out of `STAFF_ROLES` and `MANAGED_ROLES`.
- Add a table `advertiser_profiles`:
  - Columns: `user_id` (pk, references `auth.users` on delete cascade), organisation, contact name, phone, billing country, postcode, city, street, VAT number, and created/updated timestamps.
  - GRANTs go to authenticated and service_role.
  - RLS lets a user select, insert, and update only their own row (`auth.uid() = user_id`). Platform admins and the membership role can read all rows.
- Add a security-definer RPC `complete_advertiser_onboarding(...)`. It upserts the profile and inserts `user_roles(advertiser)` for `auth.uid()`. The user never writes `user_roles` directly, and the RPC is rate-limited through its server-function wrapper.
- Change the ad-request RLS so that inserts and selects of the user's own requests need `member` OR `advertiser`. Add a column `ad_requests.requester_kind` (`member` | `external`), set server-side.

**Auth**
- Call `configure_social_auth` with google, microsoft, and apple, and call `enable_email_auth`. Auto-confirm stays off, so email sign-ups must confirm their address.
- New public route `/advertise/sign-in`. It uses the existing `AuthCard`, the OAuth `redirect_uri` is `/auth/callback?next=/advertise`, and it adds an email sign-up form with a "check your email" state.
- `role-model.ts`: add `isAdvertiser`. `landingPath` sends advertiser-only accounts to `/advertise` instead of `/no-access`.
- The `/_member` gate needs no change: it already redirects accounts without the member role, so advertisers stay out of member pages.

**Routes**
- Move `/advertise` out of `_member` to a top-level route. SSR shows the public landing for everyone. A client-only section then reads the session and roles and renders one of four things:
  - the landing page with a sign-in call to action
  - the profile step
  - `MemberShell` with the wizard
  - a new `AdvertiserShell`, built from `SiteHeader` compact and `SiteFooter`, with the wizard
- Server functions under `requireSupabaseAuth` switch from member-only checks to `assertAnyRole(["member","advertiser"])`. `resolveEligibility` already falls back to the higher non-member price when no member record exists.
- Staff inbox: add a requester-type badge and an organisation profile panel.

**Copy and docs**
- Add DE, FR, IT, and EN strings for the landing page, sign-in, and profile step.
- Update `docs/` with an advertising architecture section and the role model. Add the role rule to `AGENTS.md`.

## PR note
- **Summary:** Non-members can book ads through social or email sign-in and a short profile step. Member data is never mixed with advertiser data.
- **Backend:** a new enum value, the new `advertiser_profiles` table, the onboarding RPC, wider ad-request RLS, and a `requester_kind` column.
- **Testing:** sign in with each provider in turn, check that the profile step grants access and that an advertiser is blocked from `/member`, check that a member path is unchanged, and check that the staff inbox shows the badge. Add a unit test that `landingPath` sends an advertiser to `/advertise`.
- **Risks and rollback:** the changes are additive. Reverting the code leaves the unused table and role harmless. The main risk is a wrong RLS change on ad requests, so test it with both kinds of account.
- **Follow-ups:** staff verification of external organisations, and invoicing details.
