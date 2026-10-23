-- members.auth_user_id is deliberately not granted to Data API roles.
-- Resolve ownership inside a private, caller-bound boolean helper instead.
CREATE OR REPLACE FUNCTION private.owns_vote_participation(_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = _member_id AND m.auth_user_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION private.owns_vote_participation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.owns_vote_participation(uuid) TO authenticated;

ALTER POLICY "Members read own participation" ON public.vote_participations
USING (
  private.owns_vote_participation(member_id)
  OR private.is_vote_manager(auth.uid())
);
