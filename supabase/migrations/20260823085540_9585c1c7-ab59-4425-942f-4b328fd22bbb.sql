ALTER TABLE public.newsletter_blocks
  ADD COLUMN IF NOT EXISTS image_original_url text,
  ADD COLUMN IF NOT EXISTS image_aspect text,
  ADD COLUMN IF NOT EXISTS image_crop jsonb,
  ADD COLUMN IF NOT EXISTS image_marks jsonb;

ALTER TABLE public.newsletter_blocks
  DROP CONSTRAINT IF EXISTS newsletter_blocks_image_aspect_check;

ALTER TABLE public.newsletter_blocks
  ADD CONSTRAINT newsletter_blocks_image_aspect_check
  CHECK (image_aspect IS NULL OR image_aspect IN ('banner','landscape','square','portrait'));