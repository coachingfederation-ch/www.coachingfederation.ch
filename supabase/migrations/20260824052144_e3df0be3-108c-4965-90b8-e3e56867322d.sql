create type public.event_recap_audience as enum ('attendees', 'members', 'public');

create table public.event_recaps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published')),
  language public.article_lang not null default 'en',
  headline text,
  body text,
  downloads_audience public.event_recap_audience not null default 'attendees',
  published_at timestamptz,
  created_by uuid,
  content_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_recap_translations (
  recap_id uuid not null references public.event_recaps(id) on delete cascade,
  locale public.article_lang not null,
  headline text,
  body text,
  manually_edited boolean not null default false,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (recap_id, locale)
);

create table public.event_recap_photos (
  id uuid primary key default gen_random_uuid(),
  recap_id uuid not null references public.event_recaps(id) on delete cascade,
  sort_order integer not null default 0,
  web_path text not null,
  original_path text,
  caption text,
  alt text,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index event_recap_photos_recap_idx on public.event_recap_photos (recap_id, sort_order);

create table public.event_recap_files (
  id uuid primary key default gen_random_uuid(),
  recap_id uuid not null references public.event_recaps(id) on delete cascade,
  sort_order integer not null default 0,
  path text not null,
  filename text not null,
  label text,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now()
);
create index event_recap_files_recap_idx on public.event_recap_files (recap_id, sort_order);

create table public.event_recap_linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  recap_id uuid not null references public.event_recaps(id) on delete cascade,
  status public.linkedin_post_status not null default 'pending',
  commentary text not null,
  image_count integer not null default 0,
  linkedin_post_urn text,
  linkedin_post_url text,
  posted_at timestamptz,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_recap_linkedin_posts_recap_idx on public.event_recap_linkedin_posts (recap_id, created_at desc);

grant select on public.event_recaps to anon;
grant select, insert, update, delete on public.event_recaps to authenticated;
grant all on public.event_recaps to service_role;

grant select on public.event_recap_translations to anon;
grant select, insert, update, delete on public.event_recap_translations to authenticated;
grant all on public.event_recap_translations to service_role;

grant select on public.event_recap_photos to anon;
grant select, insert, update, delete on public.event_recap_photos to authenticated;
grant all on public.event_recap_photos to service_role;

grant select, insert, update, delete on public.event_recap_files to authenticated;
grant all on public.event_recap_files to service_role;

grant select on public.event_recap_linkedin_posts to authenticated;
grant all on public.event_recap_linkedin_posts to service_role;

alter table public.event_recaps enable row level security;
alter table public.event_recap_translations enable row level security;
alter table public.event_recap_photos enable row level security;
alter table public.event_recap_files enable row level security;
alter table public.event_recap_linkedin_posts enable row level security;

create or replace function private.recap_is_public(_recap_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_recaps r
    join public.events e on e.id = r.event_id
    where r.id = _recap_id
      and r.status = 'published'
      and e.status = 'published'
      and coalesce(e.is_internal, false) = false
  )
$$;

create or replace function private.recap_is_managed_by(_recap_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_recaps r
    where r.id = _recap_id
      and private.event_is_managed_by(r.event_id, _user_id)
  )
$$;

create or replace function private.event_media_manager(_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  begin
    eid := ((storage.foldername(_name))[1])::uuid;
  exception when others then
    return false;
  end;
  return private.event_is_managed_by(eid, auth.uid());
end;
$$;

create or replace function private.event_media_is_published_web(_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eid uuid;
begin
  begin
    eid := ((storage.foldername(_name))[1])::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1
    from public.event_recaps r
    join public.events e on e.id = r.event_id
    join public.event_recap_photos p on p.recap_id = r.id
    where r.event_id = eid
      and r.status = 'published'
      and e.status = 'published'
      and coalesce(e.is_internal, false) = false
      and p.web_path = _name
  );
end;
$$;

create policy "published recaps are readable"
  on public.event_recaps for select
  using (
    status = 'published'
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.status = 'published'
        and coalesce(e.is_internal, false) = false
    )
  );

create policy "managers manage recaps"
  on public.event_recaps for all
  to authenticated
  using (private.event_is_managed_by(event_id, auth.uid()))
  with check (private.event_is_managed_by(event_id, auth.uid()));

create policy "published recap translations are readable"
  on public.event_recap_translations for select
  using (private.recap_is_public(recap_id));

create policy "managers manage recap translations"
  on public.event_recap_translations for all
  to authenticated
  using (private.recap_is_managed_by(recap_id, auth.uid()))
  with check (private.recap_is_managed_by(recap_id, auth.uid()));

create policy "published recap photos are readable"
  on public.event_recap_photos for select
  using (private.recap_is_public(recap_id));

create policy "managers manage recap photos"
  on public.event_recap_photos for all
  to authenticated
  using (private.recap_is_managed_by(recap_id, auth.uid()))
  with check (private.recap_is_managed_by(recap_id, auth.uid()));

create policy "managers manage recap files"
  on public.event_recap_files for all
  to authenticated
  using (private.recap_is_managed_by(recap_id, auth.uid()))
  with check (private.recap_is_managed_by(recap_id, auth.uid()));

create policy "managers read recap linkedin posts"
  on public.event_recap_linkedin_posts for select
  to authenticated
  using (private.recap_is_managed_by(recap_id, auth.uid()));

create trigger event_recaps_touch_updated_at
  before update on public.event_recaps
  for each row execute function public.tg_touch_updated_at();

create trigger event_recap_translations_touch_updated_at
  before update on public.event_recap_translations
  for each row execute function public.tg_touch_updated_at();

create or replace function public.tg_event_recaps_content_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.headline is distinct from old.headline
     or new.body is distinct from old.body then
    new.content_updated_at = now();
  end if;
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger event_recaps_content_updated_at
  before update on public.event_recaps
  for each row execute function public.tg_event_recaps_content_updated_at();

create policy "event managers manage event media"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'event-media' and private.event_media_manager(name))
  with check (bucket_id = 'event-media' and private.event_media_manager(name));

create policy "published recap web photos are readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-media' and private.event_media_is_published_web(name));