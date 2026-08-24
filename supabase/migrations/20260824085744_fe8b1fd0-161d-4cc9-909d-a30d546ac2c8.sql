ALTER TABLE public.newsletter_send_config
  ADD COLUMN IF NOT EXISTS group_id text,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS campaign_id text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_count integer,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.newsletter_send_config ALTER COLUMN provider SET DEFAULT 'mailerlite';
ALTER TABLE public.newsletter_send_config ALTER COLUMN is_stub SET DEFAULT false;
UPDATE public.newsletter_send_config SET provider = 'mailerlite', is_stub = false WHERE provider = 'brevo';