CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket text NOT NULL,
  subject text NOT NULL,
  hit_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY
);

CREATE INDEX IF NOT EXISTS api_rate_limits_lookup_idx
  ON public.api_rate_limits (bucket, subject, hit_at DESC);

GRANT ALL ON public.api_rate_limits TO service_role;

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate limits are staff-readable"
  ON public.api_rate_limits
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));