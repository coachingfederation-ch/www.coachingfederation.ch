-- Internal ("members only") events must not be readable by anonymous visitors.

CREATE OR REPLACE FUNCTION private.can_view_internal_events(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    private.has_role(_user_id, 'member'::app_role)
    OR private.is_internal_account(_user_id)
    OR private.is_editor(_user_id)
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_internal_events(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_internal_events(uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "public read published events" ON public.events;
CREATE POLICY "public read published events"
  ON public.events FOR SELECT TO anon, authenticated
  USING (status = 'published'::event_status AND COALESCE(is_internal, false) = false);

CREATE POLICY "members read published internal events"
  ON public.events FOR SELECT TO authenticated
  USING (
    status = 'published'::event_status
    AND COALESCE(is_internal, false) = true
    AND private.can_view_internal_events(auth.uid())
  );

-- event_translations
DROP POLICY IF EXISTS "event translations public read published" ON public.event_translations;
CREATE POLICY "event translations public read published"
  ON public.event_translations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_translations.event_id
      AND e.status = 'published'::event_status
      AND (
        COALESCE(e.is_internal, false) = false
        OR private.can_view_internal_events(auth.uid())
      )
  ));

DROP POLICY IF EXISTS "event translations manager read" ON public.event_translations;
CREATE POLICY "event translations manager read"
  ON public.event_translations FOR SELECT TO authenticated
  USING (
    private.is_editor(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_translations.event_id
        AND e.organizer_id = auth.uid()
        AND private.has_role(auth.uid(), 'organizer'::app_role)
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_translations.event_id
        AND e.status = 'published'::event_status
        AND (
          COALESCE(e.is_internal, false) = false
          OR private.can_view_internal_events(auth.uid())
        )
    )
  );

-- event_ticket_tiers
DROP POLICY IF EXISTS "public reads active tiers on published events" ON public.event_ticket_tiers;
CREATE POLICY "public reads active tiers on published events"
  ON public.event_ticket_tiers FOR SELECT TO anon, authenticated
  USING (is_active AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_ticket_tiers.event_id
      AND e.status = 'published'::event_status
      AND (
        COALESCE(e.is_internal, false) = false
        OR private.can_view_internal_events(auth.uid())
      )
  ));

-- event_forms
DROP POLICY IF EXISTS "public reads active registration forms" ON public.event_forms;
CREATE POLICY "public reads active registration forms"
  ON public.event_forms FOR SELECT TO anon, authenticated
  USING (kind = 'registration'::text AND is_active AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_forms.event_id
      AND e.status = 'published'::event_status
      AND (
        COALESCE(e.is_internal, false) = false
        OR private.can_view_internal_events(auth.uid())
      )
  ));

-- event_hosts
DROP POLICY IF EXISTS "public read event hosts" ON public.event_hosts;
CREATE POLICY "public read event hosts"
  ON public.event_hosts FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_hosts.event_id
        AND e.status = 'published'::event_status
        AND (
          COALESCE(e.is_internal, false) = false
          OR private.can_view_internal_events(auth.uid())
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.member_directory_profiles p
      WHERE p.id = event_hosts.profile_id
        AND p.visibility = 'published'::member_visibility
    )
  );
