-- Legacy privileged accounts were provisioned before the Roles screen's
-- invite flow existed, so they have no `internal_accounts` row. Both the
-- grant RLS policy and the app pre-check require either a linked member
-- record or a live internal account, so every role toggle on those accounts
-- failed with "Could not grant access.". Backfill the missing markers.
INSERT INTO public.internal_accounts (auth_user_id, display_name, email, invited_at, accepted_at)
SELECT u.id,
       COALESCE(NULLIF(TRIM(COALESCE(u.raw_user_meta_data ->> 'full_name', '')), ''), u.email),
       u.email,
       u.created_at,
       COALESCE(u.last_sign_in_at, u.created_at)
FROM auth.users u
WHERE u.email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role IN ('admin', 'administrator', 'editor', 'organizer', 'publisher', 'membership')
  )
  AND NOT EXISTS (SELECT 1 FROM public.members m WHERE m.auth_user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.internal_accounts ia WHERE ia.auth_user_id = u.id);