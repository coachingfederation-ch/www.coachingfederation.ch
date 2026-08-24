ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS recap_email_sent_at timestamptz;
ALTER TABLE public.event_recaps ADD COLUMN IF NOT EXISTS recap_email_last_sent_at timestamptz;