alter table public.guides add column content_updated_at timestamptz not null default now();

alter table public.guide_translations
  add column manually_edited boolean not null default false,
  add column source_updated_at timestamptz not null default now();

alter table public.guide_section_translations
  add column manually_edited boolean not null default false,
  add column source_updated_at timestamptz not null default now();

create or replace function public.tg_guides_content_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.title is distinct from old.title
     or new.summary is distinct from old.summary
     or new.eyebrow is distinct from old.eyebrow
     or new.intro is distinct from old.intro
     or new.footnote is distinct from old.footnote then
    new.content_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger guides_content_updated_at before update on public.guides
  for each row execute function public.tg_guides_content_updated_at();

create or replace function public.tg_guide_sections_touch_guide()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.guides set content_updated_at = now()
  where id = coalesce(new.guide_id, old.guide_id);
  return coalesce(new, old);
end;
$$;

create trigger guide_sections_touch_guide after insert or update or delete on public.guide_sections
  for each row execute function public.tg_guide_sections_touch_guide();