alter table public.europe_pulse_runs
  add column if not exists phase text not null default 'scanning',
  add column if not exists scan_cursor integer not null default 0,
  add column if not exists heartbeat_at timestamptz not null default now(),
  add column if not exists locked_until timestamptz,
  add column if not exists chapter_ids jsonb not null default '[]'::jsonb;

-- Runs that were killed mid-scan before resumability existed: close them out
-- so the control room stops showing a job that can never finish.
update public.europe_pulse_runs
   set status = 'failed',
       phase = 'failed',
       finished_at = now(),
       error_message = coalesce(error_message, 'Run was interrupted before it finished — start a new run.')
 where status = 'running';

-- Backstop only. A run normally advances itself: each slice wakes the next one
-- as soon as it finishes. This hourly job exists for the rare case where that
-- wake-up call is lost, and is a no-op when no run is unfinished.
select cron.schedule(
  'europe-pulse-advance-hourly',
  '20 * * * *',
  $$
  select net.http_post(
    url := 'https://project--9b53a55c-a944-4840-b29d-ad56f7d750f4-dev.lovable.app/api/public/europe-pulse-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select value from private.app_config where key = 'member_sync_cron_token')
    ),
    body := '{"advance": true}'::jsonb
  ) as request_id;
  $$
);