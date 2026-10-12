CREATE OR REPLACE FUNCTION public.directory_allows_non_credentialed()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT coalesce((SELECT c.allow_non_credentialed FROM public.coach_finder_config c LIMIT 1), false) $$;

DROP POLICY IF EXISTS "Public can read directory-listed members" ON public.members;
CREATE POLICY "Public can read directory-listed members" ON public.members FOR SELECT TO anon
USING (
  (public.member_is_active(activity_state) OR (public.directory_allows_non_credentialed() AND activity_state = 'grace'))
  AND (public.member_has_directory_credential(credential_slug, credential_expires_on) OR public.directory_allows_non_credentialed())
  AND EXISTS (SELECT 1 FROM public.member_directory_profiles p WHERE p.member_id = members.id AND p.visibility = 'published')
);

DROP POLICY IF EXISTS "Signed-in visitors read directory-listed members" ON public.members;
CREATE POLICY "Signed-in visitors read directory-listed members" ON public.members FOR SELECT TO authenticated
USING (
  (public.member_is_active(activity_state) OR (public.directory_allows_non_credentialed() AND activity_state = 'grace'))
  AND (public.member_has_directory_credential(credential_slug, credential_expires_on) OR public.directory_allows_non_credentialed())
  AND EXISTS (SELECT 1 FROM public.member_directory_profiles p WHERE p.member_id = members.id AND p.visibility = 'published')
);