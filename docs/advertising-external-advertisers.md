# Advertise with us — external advertisers

`/advertise` is one public URL. Signed out: landing page. Signed in, the view
depends on roles: `member` → Member Area frame; `advertiser`/platform admin →
advertiser frame; no role → organisation profile step.

- Sign-in for non-members: `/advertise/sign-in` (Google, Microsoft, Apple, email
  sign-up with confirmation). Members use `/auth`.
- The profile step calls `complete_advertiser_onboarding`, which upserts
  `advertiser_profiles` and grants `advertiser` for `auth.uid()` only.
- Booking server functions in `src/lib/ads.functions.ts` require
  member/advertiser/admin; a restrictive RLS policy enforces the same on insert.
- `ad_requests.requester_kind` (`member`|`external`) is set server-side; staff
  see a badge and, for external requests, the organisation profile.
- External advertisers price at the non-member tier (no member record);
  staff can adjust at review.
- `landingPath` sends advertiser-only accounts to `/advertise`; the `_member`
  gate keeps them out of Member Area pages.
