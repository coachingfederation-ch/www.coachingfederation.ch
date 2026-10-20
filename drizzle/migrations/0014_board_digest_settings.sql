ALTER TABLE public.integration_config
  ADD COLUMN IF NOT EXISTS board_digest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS board_digest_recipient text NOT NULL DEFAULT 'directors@coachingfederation.ch',
  ADD COLUMN IF NOT EXISTS board_digest_cadence text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS board_digest_weekday integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS board_digest_hour integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS board_digest_sections jsonb NOT NULL DEFAULT '{"members":true,"articles":true,"events":true,"assistant":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS board_digest_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS board_digest_last_status text;
ALTER TABLE public.integration_config
  ADD CONSTRAINT board_digest_cadence_check CHECK (board_digest_cadence IN ('weekly','biweekly')),
  ADD CONSTRAINT board_digest_weekday_check CHECK (board_digest_weekday BETWEEN 0 AND 6),
  ADD CONSTRAINT board_digest_hour_check CHECK (board_digest_hour BETWEEN 0 AND 23);