-- Re-assert column-scoped public read access on public.members.
-- Row policies filter WHICH members are visible; these grants filter WHICH
-- fields are readable. Sensitive columns (email, phone, cst_recno,
-- diagnostics, membership dates, auth_user_id, ...) must never be granted to
-- anon/authenticated: public directory display data lives in
-- member_directory_profiles.
REVOKE ALL ON TABLE public.members FROM anon, authenticated;

GRANT SELECT (
  id,
  full_name,
  first_name,
  last_name,
  city,
  country,
  organisation,
  credential_slug,
  credential_awarded_on,
  credential_expires_on,
  activity_state
) ON public.members TO anon, authenticated;
