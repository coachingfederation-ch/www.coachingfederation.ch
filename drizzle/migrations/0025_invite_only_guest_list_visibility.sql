-- Invite-only events are visible only to people on that event's guest list
-- (matched by account or by linked member record), attendees who already
-- hold a confirmed registration, and the event's managers (editors/admins and
-- the owning organizer). Membership alone no longer grants visibility.
CREATE OR REPLACE FUNCTION private.is_on_event_guest_list(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.event_invitations i
      WHERE i.event_id = _event_id
        AND i.status <> 'revoked'
        AND (
          i.user_id = _user_id
          OR i.member_id IN (SELECT m.id FROM public.members m WHERE m.auth_user_id = _user_id)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.event_registrations r
      WHERE r.event_id = _event_id AND r.user_id = _user_id AND r.status = 'confirmed'
    )
  );
$$;
REVOKE ALL ON FUNCTION private.is_on_event_guest_list(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_on_event_guest_list(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_view_invite_only_event(_event_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    private.event_is_managed_by(_event_id, _user_id)
    OR private.is_on_event_guest_list(_event_id, _user_id)
  );
$$;

-- Event ids of invite-only events the caller is personally on the guest list
-- for. Used by the member Events listing so staff do not see every
-- invite-only event there; staff still reach them via the CMS or direct link.
CREATE OR REPLACE FUNCTION public.my_invite_only_event_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.id FROM public.events e
  WHERE e.status = 'published'::event_status
    AND e.registration_mode IN ('rsvp_invited'::event_registration_mode, 'rsvp_invited_open'::event_registration_mode)
    AND private.is_on_event_guest_list(e.id, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.my_invite_only_event_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_invite_only_event_ids() TO authenticated;