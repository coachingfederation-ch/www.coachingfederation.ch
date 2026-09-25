DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND policyname LIKE '%editors write'
      AND tablename IN ('guides','guide_sections','guide_translations','guide_section_translations','guide_section_callouts','guide_callout_translations','guide_faq_items','guide_faq_item_translations')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()))',
      replace(r.policyname,'editors write','admins write'), r.tablename);
  END LOOP;
END $$;