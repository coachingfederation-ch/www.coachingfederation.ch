CREATE OR REPLACE FUNCTION public.directory_allows_non_credentialed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT c.allow_non_credentialed FROM public.coach_finder_config c LIMIT 1), false)
$$;