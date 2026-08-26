ALTER TABLE public.event_forms
  ADD COLUMN IF NOT EXISTS auto_send boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_reminder_at timestamptz;

COMMENT ON COLUMN public.event_forms.auto_send IS 'Follow-up forms: send the invitation automatically ~15 minutes after the event ends.';
COMMENT ON COLUMN public.event_forms.auto_sent_at IS 'When the automatic invitation run handled this form (also set by a manual send).';
COMMENT ON COLUMN public.event_forms.auto_reminder_at IS 'When the automatic three-day reminder run handled this form.';