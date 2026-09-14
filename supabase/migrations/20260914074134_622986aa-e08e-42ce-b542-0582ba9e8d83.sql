-- event_recap_files: metadata is never public; only signed-in managers (RLS) touch it.
REVOKE ALL ON public.event_recap_files FROM anon;
REVOKE ALL ON public.event_recap_files FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_recap_files TO authenticated;
GRANT ALL ON public.event_recap_files TO service_role;

-- event_recap_linkedin_posts: written only by server-side (service role) publishing
-- code; managers may read their own recap's posting history.
REVOKE ALL ON public.event_recap_linkedin_posts FROM anon;
REVOKE ALL ON public.event_recap_linkedin_posts FROM authenticated;
GRANT SELECT ON public.event_recap_linkedin_posts TO authenticated;
GRANT ALL ON public.event_recap_linkedin_posts TO service_role;