-- 1. Section kind
alter table public.guide_sections
  add column kind text not null default 'article'
  constraint guide_sections_kind_check check (kind in ('article','faq'));

-- 2. Callouts
create table public.guide_section_callouts (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  position integer not null default 0,
  kind text not null default 'info',
  label text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_section_callouts_kind_check check (kind in ('info','warning','critical'))
);

create table public.guide_callout_translations (
  id uuid primary key default gen_random_uuid(),
  callout_id uuid not null references public.guide_section_callouts(id) on delete cascade,
  locale text not null,
  label text not null default '',
  body text not null default '',
  manually_edited boolean not null default false,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_callout_translations_locale_check check (locale in ('de','fr','it')),
  unique (callout_id, locale)
);

-- 3. FAQ items
create table public.guide_faq_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  position integer not null default 0,
  question text not null default '',
  answer text not null default '',
  quote text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guide_faq_item_translations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.guide_faq_items(id) on delete cascade,
  locale text not null,
  question text not null default '',
  answer text not null default '',
  quote text not null default '',
  manually_edited boolean not null default false,
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_faq_item_translations_locale_check check (locale in ('de','fr','it')),
  unique (item_id, locale)
);

create index guide_section_callouts_section_idx on public.guide_section_callouts (section_id, position);
create index guide_callout_translations_callout_idx on public.guide_callout_translations (callout_id);
create index guide_faq_items_section_idx on public.guide_faq_items (section_id, position);
create index guide_faq_item_translations_item_idx on public.guide_faq_item_translations (item_id);

-- 4. Grants
grant select on public.guide_section_callouts to anon;
grant select, insert, update, delete on public.guide_section_callouts to authenticated;
grant all on public.guide_section_callouts to service_role;

grant select on public.guide_callout_translations to anon;
grant select, insert, update, delete on public.guide_callout_translations to authenticated;
grant all on public.guide_callout_translations to service_role;

grant select on public.guide_faq_items to anon;
grant select, insert, update, delete on public.guide_faq_items to authenticated;
grant all on public.guide_faq_items to service_role;

grant select on public.guide_faq_item_translations to anon;
grant select, insert, update, delete on public.guide_faq_item_translations to authenticated;
grant all on public.guide_faq_item_translations to service_role;

-- 5. RLS
alter table public.guide_section_callouts enable row level security;
alter table public.guide_callout_translations enable row level security;
alter table public.guide_faq_items enable row level security;
alter table public.guide_faq_item_translations enable row level security;

create policy "guide callouts public read published" on public.guide_section_callouts
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_sections s
    join public.guides g on g.id = s.guide_id
    where s.id = section_id and g.is_published
  ));
create policy "guide callouts editors write" on public.guide_section_callouts
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide callout translations public read published" on public.guide_callout_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_section_callouts c
    join public.guide_sections s on s.id = c.section_id
    join public.guides g on g.id = s.guide_id
    where c.id = callout_id and g.is_published
  ));
create policy "guide callout translations editors write" on public.guide_callout_translations
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide faq items public read published" on public.guide_faq_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_sections s
    join public.guides g on g.id = s.guide_id
    where s.id = section_id and g.is_published
  ));
create policy "guide faq items editors write" on public.guide_faq_items
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide faq item translations public read published" on public.guide_faq_item_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_faq_items i
    join public.guide_sections s on s.id = i.section_id
    join public.guides g on g.id = s.guide_id
    where i.id = item_id and g.is_published
  ));
create policy "guide faq item translations editors write" on public.guide_faq_item_translations
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create trigger guide_section_callouts_touch_updated_at before update on public.guide_section_callouts
  for each row execute function tg_touch_updated_at();
create trigger guide_callout_translations_touch_updated_at before update on public.guide_callout_translations
  for each row execute function tg_touch_updated_at();
create trigger guide_faq_items_touch_updated_at before update on public.guide_faq_items
  for each row execute function tg_touch_updated_at();
create trigger guide_faq_item_translations_touch_updated_at before update on public.guide_faq_item_translations
  for each row execute function tg_touch_updated_at();

-- 6. Move existing single callouts into the new list, keeping translations.
insert into public.guide_section_callouts (id, section_id, position, kind, label, body)
select s.id, s.id, 0,
       case s.tone when 'critical' then 'critical' when 'caution' then 'warning' else 'info' end,
       '', s.callout
from public.guide_sections s
where btrim(s.callout) <> '';

insert into public.guide_callout_translations (callout_id, locale, label, body, manually_edited)
select st.section_id, st.locale, '', st.callout, true
from public.guide_section_translations st
join public.guide_section_callouts c on c.id = st.section_id
where btrim(st.callout) <> '';

alter table public.guide_sections drop column callout;
alter table public.guide_section_translations drop column callout;