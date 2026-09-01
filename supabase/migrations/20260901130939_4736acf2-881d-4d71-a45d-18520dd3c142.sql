alter table public.op_projects
  add column if not exists cover_image_url text,
  add column if not exists cover_image_alt text,
  add column if not exists image_source text,
  add column if not exists image_credit_name text,
  add column if not exists image_credit_url text;

alter table public.op_projects
  drop constraint if exists op_projects_image_source_check;
alter table public.op_projects
  add constraint op_projects_image_source_check
  check (image_source is null or image_source in ('upload', 'url', 'unsplash', 'ai'));

grant select (cover_image_url, cover_image_alt, image_source, image_credit_name, image_credit_url)
  on public.op_projects to anon;
grant select (cover_image_url, cover_image_alt, image_source, image_credit_name, image_credit_url)
  on public.op_projects to authenticated;

create or replace view public.team_projects_public with (security_invoker = on) as
 SELECT id,
    slug,
    name,
    name_de,
    name_fr,
    name_it,
    sort_order,
    is_community,
    is_featured_community,
    description,
    description_de,
    description_fr,
    description_it,
    cadence_note,
    cadence_note_de,
    cadence_note_fr,
    cadence_note_it,
    public_contact_email AS contact_email,
    signup_url,
    language_slugs,
    cover_image_url,
    cover_image_alt,
    image_source,
    image_credit_name,
    image_credit_url
   FROM op_projects
  WHERE is_active;