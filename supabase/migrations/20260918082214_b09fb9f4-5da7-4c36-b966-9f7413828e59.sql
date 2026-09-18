ALTER TABLE public.event_hosts
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS blurb text;