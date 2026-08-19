create table if not exists public.role_grants_archive (
  id uuid primary key,
  user_id uuid not null,
  role public.app_role not null,
  action text not null,
  actor_user_id uuid,
  created_at timestamptz not null,
  archived_at timestamptz not null default now()
);

create index if not exists role_grants_archive_created_at_idx
  on public.role_grants_archive using btree (created_at desc);

revoke all on public.role_grants_archive from anon;
revoke all on public.role_grants_archive from authenticated;
grant all on public.role_grants_archive to service_role;

alter table public.role_grants_archive enable row level security;

-- Deliberately no permissive policy: the archive is reachable only through the
-- service-role path used by the scheduled retention job.

revoke all on public.role_grants from anon;

create or replace function private.archive_old_role_grants(_older_than interval default interval '24 months')
returns integer
language sql
security definer
set search_path = public, private
as $$
  with moved as (
    delete from public.role_grants
    where created_at < now() - _older_than
    returning id, user_id, role, action, actor_user_id, created_at
  ), inserted as (
    insert into public.role_grants_archive (id, user_id, role, action, actor_user_id, created_at)
    select id, user_id, role, action, actor_user_id, created_at from moved
    on conflict (id) do nothing
    returning 1
  )
  select count(*)::int from inserted;
$$;

revoke all on function private.archive_old_role_grants(interval) from public;
revoke all on function private.archive_old_role_grants(interval) from anon;
revoke all on function private.archive_old_role_grants(interval) from authenticated;

select cron.schedule(
  'role-grants-archive-nightly',
  '40 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://project--9b53a55c-a944-4840-b29d-ad56f7d750f4-dev.lovable.app/api/public/role-grants-archive',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select value from private.app_config where key = 'member_sync_cron_token')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);