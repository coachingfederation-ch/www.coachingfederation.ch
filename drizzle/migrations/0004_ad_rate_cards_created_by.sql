ALTER TABLE public.ad_rate_cards ADD COLUMN IF NOT EXISTS created_by uuid;
NOTIFY pgrst, 'reload schema';