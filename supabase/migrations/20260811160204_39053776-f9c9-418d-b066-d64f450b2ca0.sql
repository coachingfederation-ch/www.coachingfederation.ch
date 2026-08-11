ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_error text,
  ADD COLUMN IF NOT EXISTS confirmation_sequence integer NOT NULL DEFAULT 0;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_locale_check CHECK (locale IN ('en','de','fr','it')),
  ADD CONSTRAINT event_registrations_confirmation_status_check
    CHECK (confirmation_status IN ('not_sent','sending','sent','failed'));

-- Column-scoped reads: the table has no table-wide SELECT for authenticated,
-- so each readable column is granted explicitly.
GRANT SELECT (locale, confirmation_status, confirmation_sent_at, confirmation_error, confirmation_sequence)
  ON public.event_registrations TO authenticated;

-- The attendee names their own locale at insert time; everything else about
-- the confirmation state is written by the server only.
GRANT INSERT (locale) ON public.event_registrations TO anon;