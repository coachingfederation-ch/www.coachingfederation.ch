create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  summary text not null default '',
  eyebrow text not null default '',
  intro text not null default '',
  version_label text not null default '',
  contact_email text,
  footnote text not null default '',
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guide_sections (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  position integer not null default 0,
  tone text not null default 'neutral',
  eyebrow text not null default '',
  heading text not null default '',
  lead text not null default '',
  body text not null default '',
  callout text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_sections_tone_check check (tone in ('neutral','positive','caution','critical'))
);

create table public.guide_translations (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  locale text not null,
  title text not null default '',
  summary text not null default '',
  eyebrow text not null default '',
  intro text not null default '',
  footnote text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_translations_locale_check check (locale in ('de','fr','it')),
  unique (guide_id, locale)
);

create table public.guide_section_translations (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.guide_sections(id) on delete cascade,
  locale text not null,
  eyebrow text not null default '',
  heading text not null default '',
  lead text not null default '',
  body text not null default '',
  callout text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_section_translations_locale_check check (locale in ('de','fr','it')),
  unique (section_id, locale)
);

create index guide_sections_guide_idx on public.guide_sections (guide_id, position);
create index guide_translations_guide_idx on public.guide_translations (guide_id);
create index guide_section_translations_section_idx on public.guide_section_translations (section_id);

grant select on public.guides to anon;
grant select, insert, update, delete on public.guides to authenticated;
grant all on public.guides to service_role;

grant select on public.guide_sections to anon;
grant select, insert, update, delete on public.guide_sections to authenticated;
grant all on public.guide_sections to service_role;

grant select on public.guide_translations to anon;
grant select, insert, update, delete on public.guide_translations to authenticated;
grant all on public.guide_translations to service_role;

grant select on public.guide_section_translations to anon;
grant select, insert, update, delete on public.guide_section_translations to authenticated;
grant all on public.guide_section_translations to service_role;

alter table public.guides enable row level security;
alter table public.guide_sections enable row level security;
alter table public.guide_translations enable row level security;
alter table public.guide_section_translations enable row level security;

create policy "guides public read published" on public.guides
  for select to anon, authenticated using (is_published);
create policy "guides editors write" on public.guides
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide sections public read published" on public.guide_sections
  for select to anon, authenticated
  using (exists (select 1 from public.guides g where g.id = guide_id and g.is_published));
create policy "guide sections editors write" on public.guide_sections
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide translations public read published" on public.guide_translations
  for select to anon, authenticated
  using (exists (select 1 from public.guides g where g.id = guide_id and g.is_published));
create policy "guide translations editors write" on public.guide_translations
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create policy "guide section translations public read published" on public.guide_section_translations
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_sections s
    join public.guides g on g.id = s.guide_id
    where s.id = section_id and g.is_published
  ));
create policy "guide section translations editors write" on public.guide_section_translations
  for all to authenticated using (private.is_editor(auth.uid())) with check (private.is_editor(auth.uid()));

create trigger guides_touch_updated_at before update on public.guides
  for each row execute function tg_touch_updated_at();
create trigger guide_sections_touch_updated_at before update on public.guide_sections
  for each row execute function tg_touch_updated_at();
create trigger guide_translations_touch_updated_at before update on public.guide_translations
  for each row execute function tg_touch_updated_at();
create trigger guide_section_translations_touch_updated_at before update on public.guide_section_translations
  for each row execute function tg_touch_updated_at();