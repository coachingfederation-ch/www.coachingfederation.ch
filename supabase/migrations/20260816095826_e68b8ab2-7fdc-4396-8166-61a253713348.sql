DROP POLICY "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['administrator','editor','organizer','publisher']::public.app_role[])
    AND private.has_role(user_id, 'member')
  );

DROP POLICY "admins revoke managed roles" ON public.user_roles;
CREATE POLICY "admins revoke managed roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    AND role = ANY (ARRAY['administrator','editor','organizer','publisher']::public.app_role[])
  );