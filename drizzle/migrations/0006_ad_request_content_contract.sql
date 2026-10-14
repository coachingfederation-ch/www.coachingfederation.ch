ALTER TABLE public.ad_requests
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS headline_de text,
  ADD COLUMN IF NOT EXISTS headline_fr text,
  ADD COLUMN IF NOT EXISTS headline_it text,
  ADD COLUMN IF NOT EXISTS headline_en text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_postcode text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_country text,
  ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.ad_placements
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS headline_de text,
  ADD COLUMN IF NOT EXISTS headline_fr text,
  ADD COLUMN IF NOT EXISTS headline_it text,
  ADD COLUMN IF NOT EXISTS headline_en text;