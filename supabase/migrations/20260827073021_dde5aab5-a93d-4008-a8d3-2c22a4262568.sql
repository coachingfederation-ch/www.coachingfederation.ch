CREATE OR REPLACE FUNCTION private.member_is_inviter(_member_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members m
     WHERE m.id = _member_id
       AND m.auth_user_id = _user_id
  )
$$;

DROP POLICY "members read their own guest passes" ON public.guest_passes;
CREATE POLICY "members read their own guest passes"
  ON public.guest_passes FOR SELECT
  TO authenticated
  USING (private.member_is_inviter(inviting_member_id, auth.uid()));

DROP POLICY "members create their own pending guest pass" ON public.guest_passes;
CREATE POLICY "members create their own pending guest pass"
  ON public.guest_passes FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND private.member_is_inviter(inviting_member_id, auth.uid())
  );