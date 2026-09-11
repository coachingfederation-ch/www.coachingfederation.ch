ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS series_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS series_source_hash text;