REVOKE ALL ON public.guest_passes FROM anon;
REVOKE ALL ON public.guest_passes FROM authenticated;
GRANT SELECT, INSERT ON public.guest_passes TO authenticated;
GRANT ALL ON public.guest_passes TO service_role;

-- Column-scoped update rights for the membership-staff decision workflow.
GRANT UPDATE (status, decision_by, decision_at, decision_note, registration_id,
              follow_up_status, follow_up_note, converted_member_id, updated_at)
  ON public.guest_passes TO authenticated;

CREATE OR REPLACE FUNCTION private.member_is_inviter(_member_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND _member_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.members m
        WHERE m.id = _member_id
          AND m.auth_user_id = _user_id
     )
$function$;

CREATE OR REPLACE FUNCTION private.is_membership_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (
       private.has_role(_user_id, 'admin'::public.app_role)
       OR private.has_role(_user_id, 'administrator'::public.app_role)
       OR private.has_role(_user_id, 'membership'::public.app_role)
     )
$function$;

CREATE OR REPLACE FUNCTION private.event_is_managed_by(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (
       private.is_editor(_user_id)
       OR EXISTS (
         SELECT 1 FROM public.events e
         WHERE e.id = _event_id
           AND e.organizer_id = _user_id
           AND private.has_role(_user_id, 'organizer')
       )
     )
$function$;