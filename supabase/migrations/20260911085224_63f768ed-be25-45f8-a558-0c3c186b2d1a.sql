DROP POLICY IF EXISTS "Public can read published profile translations" ON public.member_profile_translations;
DROP POLICY IF EXISTS "Signed-in visitors read published profile translations" ON public.member_profile_translations;

CREATE POLICY "Public can read published profile translations"
ON public.member_profile_translations FOR SELECT TO anon
USING (
  is_ready AND EXISTS (
    SELECT 1 FROM public.member_directory_profiles p
    WHERE p.id = member_profile_translations.profile_id
      AND p.visibility = 'published'::member_visibility
  )
);

CREATE POLICY "Signed-in visitors read published profile translations"
ON public.member_profile_translations FOR SELECT TO authenticated
USING (
  is_ready AND EXISTS (
    SELECT 1 FROM public.member_directory_profiles p
    WHERE p.id = member_profile_translations.profile_id
      AND p.visibility = 'published'::member_visibility
  )
);