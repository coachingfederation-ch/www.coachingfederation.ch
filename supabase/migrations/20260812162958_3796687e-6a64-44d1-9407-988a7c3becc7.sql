REVOKE EXECUTE ON FUNCTION public.check_in_registration(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.undo_check_in(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_registration(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_check_in(uuid) TO authenticated, service_role;