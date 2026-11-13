CREATE OR REPLACE FUNCTION private.can_view_invite_only_event(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    private.can_view_internal_events(_user_id)
    OR EXISTS (SELECT 1 FROM public.event_invitations i WHERE i.event_id = _event_id AND i.user_id = _user_id)
  );
$$;
REVOKE ALL ON FUNCTION private.can_view_invite_only_event(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.can_view_invite_only_event(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "public read published events" ON public.events;
CREATE POLICY "public read published events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'::event_status
    AND (
      registration_mode NOT IN ('rsvp_invited'::event_registration_mode, 'rsvp_invited_open'::event_registration_mode)
      OR private.can_view_invite_only_event(id, auth.uid())
    )
  );