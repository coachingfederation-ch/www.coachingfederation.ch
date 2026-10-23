CREATE OR REPLACE FUNCTION public.feature_flags()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    (SELECT jsonb_build_object(
       'europe_pulse', feature_europe_pulse_enabled,
       'advertising', feature_advertising_enabled,
       'votes', feature_votes_enabled)
     FROM public.integration_config WHERE id = true),
    jsonb_build_object('europe_pulse', true, 'advertising', true, 'votes', true))
$function$;

CREATE POLICY "Vote managers upload vote files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vote-files' AND private.is_vote_manager(auth.uid()));
CREATE POLICY "Vote managers delete vote files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vote-files' AND private.is_vote_manager(auth.uid()));
CREATE POLICY "Members and managers read vote files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vote-files' AND (private.is_vote_manager(auth.uid()) OR private.has_role(auth.uid(),'member')));

select cron.schedule(
  'member-votes-hourly',
  '23 * * * *',
  $$
  select net.http_post(
    url := 'https://project--9b53a55c-a944-4840-b29d-ad56f7d750f4-dev.lovable.app/api/public/member-votes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select value from private.app_config where key = 'member_sync_cron_token')
    ),
    body := '{}'::jsonb
  );
  $$
);