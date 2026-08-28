DROP POLICY IF EXISTS "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles"
ON public.user_roles
FOR INSERT
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
ON public.user_roles
FOR DELETE
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND role = ANY (ARRAY['administrator'::app_role, 'editor'::app_role, 'organizer'::app_role, 'publisher'::app_role, 'membership'::app_role, 'admin'::app_role])
);