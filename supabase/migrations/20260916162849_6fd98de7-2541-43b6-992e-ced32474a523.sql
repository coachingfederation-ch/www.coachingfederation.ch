DROP POLICY IF EXISTS "public read published events" ON public.events;
DROP POLICY IF EXISTS "members read published internal events" ON public.events;
CREATE POLICY "public read published events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'published'::event_status);