ALTER TABLE public.contact_enquiries
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'contact';

ALTER TABLE public.contact_enquiries
  DROP CONSTRAINT IF EXISTS contact_enquiries_kind_check;

ALTER TABLE public.contact_enquiries
  ADD CONSTRAINT contact_enquiries_kind_check
  CHECK (kind IN ('contact', 'event_proposal'));