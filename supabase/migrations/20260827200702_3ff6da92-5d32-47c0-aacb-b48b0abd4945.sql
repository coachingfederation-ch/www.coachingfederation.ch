CREATE OR REPLACE FUNCTION private.member_belongs_to(_member_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = _member_id AND m.auth_user_id = _user_id
  )
$$;

GRANT EXECUTE ON FUNCTION private.member_belongs_to(uuid, uuid) TO authenticated;

DROP POLICY "Holders read their own certificates" ON public.event_certificates;
CREATE POLICY "Holders read their own certificates"
  ON public.event_certificates FOR SELECT TO authenticated
  USING (member_id IS NOT NULL AND private.member_belongs_to(member_id, auth.uid()));

DROP POLICY "Holders read their own awards" ON public.event_cce_awards;
CREATE POLICY "Holders read their own awards"
  ON public.event_cce_awards FOR SELECT TO authenticated
  USING (member_id IS NOT NULL AND private.member_belongs_to(member_id, auth.uid()));