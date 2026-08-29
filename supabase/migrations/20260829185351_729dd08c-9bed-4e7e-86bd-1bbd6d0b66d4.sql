select cron.schedule(
  'contact-enquiry-purge-daily',
  '5 4 * * *',
  $cron$
  select net.http_post(
    url := 'https://project--9b53a55c-a944-4840-b29d-ad56f7d750f4-dev.lovable.app/api/public/contact-enquiry-purge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select value from private.app_config where key = 'member_sync_cron_token')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);