ALTER TABLE public.newsletter_blocks
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS image_source text,
  ADD COLUMN IF NOT EXISTS image_credit_name text,
  ADD COLUMN IF NOT EXISTS image_credit_url text;

ALTER TABLE public.newsletter_blocks
  DROP CONSTRAINT IF EXISTS newsletter_blocks_image_source_check;

ALTER TABLE public.newsletter_blocks
  ADD CONSTRAINT newsletter_blocks_image_source_check
  CHECK (image_source IS NULL OR image_source IN ('unsplash', 'upload', 'url', 'ai'));