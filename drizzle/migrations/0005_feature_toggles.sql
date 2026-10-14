ALTER TABLE public.integration_config
  ADD COLUMN IF NOT EXISTS feature_europe_pulse_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_advertising_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS features_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS features_updated_by uuid;

CREATE OR REPLACE FUNCTION public.feature_flags()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object(
       'europe_pulse', feature_europe_pulse_enabled,
       'advertising', feature_advertising_enabled)
     FROM public.integration_config WHERE id = true),
    jsonb_build_object('europe_pulse', true, 'advertising', true))
$$;

REVOKE ALL ON FUNCTION public.feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feature_flags() TO anon, authenticated, service_role;