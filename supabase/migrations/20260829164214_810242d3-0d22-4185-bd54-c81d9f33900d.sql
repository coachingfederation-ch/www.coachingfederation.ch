-- 1. Revoke unnecessary EXECUTE on SECURITY DEFINER functions in public schema.
REVOKE ALL ON FUNCTION public.apply_attendance_import(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.attendance_session_status(text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.self_check_in_with_ticket(text, text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.get_certificate_by_token(text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.open_event_attendance_session(uuid, integer) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.close_event_attendance_session(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_attendance_session(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.tg_registration_attendance_undone() FROM anon, authenticated, PUBLIC;

-- 2. Scope recap read policies explicitly to anon + authenticated.
DROP POLICY IF EXISTS "published recaps are readable" ON public.event_recaps;
CREATE POLICY "published recaps are readable"
  ON public.event_recaps FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_recaps.event_id
        AND e.status = 'published'::event_status
        AND COALESCE(e.is_internal, false) = false
    )
  );

DROP POLICY IF EXISTS "published recap photos are readable" ON public.event_recap_photos;
CREATE POLICY "published recap photos are readable"
  ON public.event_recap_photos FOR SELECT TO anon, authenticated
  USING (private.recap_is_public(recap_id));

DROP POLICY IF EXISTS "published recap translations are readable" ON public.event_recap_translations;
CREATE POLICY "published recap translations are readable"
  ON public.event_recap_translations FOR SELECT TO anon, authenticated
  USING (private.recap_is_public(recap_id));

-- 3. Scope user_roles grant/revoke policies to authenticated only.
DROP POLICY IF EXISTS "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    AND (
      (
        role = ANY (ARRAY['administrator'::app_role, 'editor'::app_role, 'organizer'::app_role, 'publisher'::app_role, 'membership'::app_role])
        AND (private.has_role(user_id, 'member'::app_role) OR private.is_internal_account(user_id))
      )
      OR role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "admins revoke managed roles" ON public.user_roles;
CREATE POLICY "admins revoke managed roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    AND role = ANY (ARRAY['administrator'::app_role, 'editor'::app_role, 'organizer'::app_role, 'publisher'::app_role, 'membership'::app_role, 'admin'::app_role])
  );
