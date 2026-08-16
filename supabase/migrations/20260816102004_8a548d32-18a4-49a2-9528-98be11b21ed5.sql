DROP POLICY IF EXISTS "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND (
      (
        role = ANY (ARRAY['administrator','editor','organizer','publisher']::public.app_role[])
        AND private.has_role(user_id, 'member')
      )
      -- Super Admin is grantable to any existing account: internal staff
      -- accounts legitimately have no imported member record.
      OR role = 'admin'::public.app_role
    )
  );

DROP POLICY IF EXISTS "admins revoke managed roles" ON public.user_roles;
CREATE POLICY "admins revoke managed roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['administrator','editor','organizer','publisher','admin']::public.app_role[])
  );

-- Lockout protection lives in the database, not the UI: a Super Admin may not
-- drop their own grant, and the final Super Admin row can never be deleted.
CREATE OR REPLACE FUNCTION public.tg_user_roles_protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining integer;
BEGIN
  IF OLD.role <> 'admin'::public.app_role THEN
    RETURN OLD;
  END IF;

  IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'you cannot remove your own Super Admin access';
  END IF;

  SELECT count(*) INTO remaining
    FROM public.user_roles
   WHERE role = 'admin'::public.app_role;
  IF remaining <= 1 THEN
    RAISE EXCEPTION 'the last Super Admin cannot be removed';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_protect_last_admin ON public.user_roles;
CREATE TRIGGER user_roles_protect_last_admin
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_roles_protect_last_admin();