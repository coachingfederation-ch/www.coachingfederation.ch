CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_de text, title_fr text, title_it text,
  summary text, summary_de text, summary_fr text, summary_it text,
  description text, description_de text, description_fr text, description_it text,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  options jsonb NOT NULL DEFAULT '[{"key":"yes","label":"Yes"},{"key":"no","label":"No"},{"key":"abstain","label":"Abstain"}]'::jsonb,
  results_mode text NOT NULL DEFAULT 'after_vote' CHECK (results_mode IN ('after_vote','after_close')),
  rationale_enabled boolean NOT NULL DEFAULT true,
  announce_enabled boolean NOT NULL DEFAULT true,
  announced_at timestamptz,
  reminded_at timestamptz,
  eligible_count integer,
  ai_summary text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_at > opens_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_vote_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  select private.has_role(_user_id,'admin') or private.has_role(_user_id,'administrator') or private.has_role(_user_id,'membership')
$$;

CREATE POLICY "Managers manage votes" ON public.votes FOR ALL TO authenticated
  USING (private.is_vote_manager(auth.uid())) WITH CHECK (private.is_vote_manager(auth.uid()));
CREATE POLICY "Members read published votes" ON public.votes FOR SELECT TO authenticated
  USING (status IN ('published','archived') AND private.has_role(auth.uid(),'member'));

CREATE TRIGGER votes_touch BEFORE UPDATE ON public.votes FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.vote_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vote_attachments TO authenticated;
GRANT ALL ON public.vote_attachments TO service_role;
ALTER TABLE public.vote_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage vote files" ON public.vote_attachments FOR ALL TO authenticated
  USING (private.is_vote_manager(auth.uid())) WITH CHECK (private.is_vote_manager(auth.uid()));
CREATE POLICY "Members read vote files" ON public.vote_attachments FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'member') AND EXISTS (select 1 from public.votes v where v.id = vote_id and v.status in ('published','archived')));

-- Who voted. No choice is stored here, and only the day, so it cannot be matched to a ballot.
CREATE TABLE public.vote_participations (
  vote_id uuid NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  voted_on date NOT NULL DEFAULT current_date,
  PRIMARY KEY (vote_id, member_id)
);
GRANT SELECT ON public.vote_participations TO authenticated;
GRANT ALL ON public.vote_participations TO service_role;
ALTER TABLE public.vote_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own participation" ON public.vote_participations FOR SELECT TO authenticated
  USING (member_id IN (select m.id from public.members m where m.auth_user_id = auth.uid()) OR private.is_vote_manager(auth.uid()));

-- What was voted. No member reference.
CREATE TABLE public.vote_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.votes(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  rationale text CHECK (rationale IS NULL OR char_length(rationale) <= 500),
  hidden boolean NOT NULL DEFAULT false,
  receipt text NOT NULL UNIQUE,
  cast_on date NOT NULL DEFAULT current_date
);
CREATE INDEX vote_ballots_vote_idx ON public.vote_ballots(vote_id);
GRANT SELECT, UPDATE ON public.vote_ballots TO authenticated;
GRANT ALL ON public.vote_ballots TO service_role;
ALTER TABLE public.vote_ballots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read ballots" ON public.vote_ballots FOR SELECT TO authenticated USING (private.is_vote_manager(auth.uid()));
CREATE POLICY "Managers moderate ballots" ON public.vote_ballots FOR UPDATE TO authenticated
  USING (private.is_vote_manager(auth.uid())) WITH CHECK (private.is_vote_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.vote_eligible_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select count(*)::int from public.members where activity_state in ('active','grace') and auth_user_id is not null
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(_vote_id uuid, _option_key text, _rationale text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
declare
  v public.votes%rowtype;
  m_id uuid;
  r text;
  clean text := nullif(btrim(coalesce(_rationale,'')), '');
begin
  select id into m_id from public.members
   where auth_user_id = auth.uid() and activity_state in ('active','grace') limit 1;
  if m_id is null then raise exception 'not_eligible'; end if;
  select * into v from public.votes where id = _vote_id for update;
  if not found or v.status <> 'published' then raise exception 'not_available'; end if;
  if now() < v.opens_at or now() >= v.closes_at then raise exception 'not_open'; end if;
  if not exists (select 1 from jsonb_array_elements(v.options) o where o->>'key' = _option_key) then
    raise exception 'invalid_option';
  end if;
  if not v.rationale_enabled then clean := null; end if;
  if clean is not null and char_length(clean) > 500 then raise exception 'rationale_too_long'; end if;
  begin
    insert into public.vote_participations(vote_id, member_id) values (_vote_id, m_id);
  exception when unique_violation then
    raise exception 'already_voted';
  end;
  r := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.vote_ballots(vote_id, option_key, rationale, receipt) values (_vote_id, _option_key, clean, r);
  if v.eligible_count is null then
    update public.votes set eligible_count = public.vote_eligible_count() where id = _vote_id;
  end if;
  return r;
end $$;
REVOKE ALL ON FUNCTION public.cast_vote(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid,text,text) TO authenticated;

-- Whether the caller may see the tally / rationales for a vote.
CREATE OR REPLACE FUNCTION private.can_see_vote_results(_vote_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  select private.is_vote_manager(_uid) or exists (
    select 1 from public.votes v
    where v.id = _vote_id and v.status in ('published','archived') and private.has_role(_uid,'member')
      and (
        now() >= v.closes_at
        or (v.results_mode = 'after_vote' and exists (
          select 1 from public.vote_participations p join public.members m on m.id = p.member_id
          where p.vote_id = v.id and m.auth_user_id = _uid))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.vote_tally(_vote_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
declare v public.votes%rowtype; result jsonb;
begin
  if not private.can_see_vote_results(_vote_id, auth.uid()) then return null; end if;
  select * into v from public.votes where id = _vote_id;
  select jsonb_build_object(
    'participants', (select count(*) from public.vote_participations where vote_id = _vote_id),
    'eligible', coalesce(v.eligible_count, public.vote_eligible_count()),
    'counts', coalesce((select jsonb_object_agg(option_key, n) from (
        select option_key, count(*) n from public.vote_ballots where vote_id = _vote_id group by option_key) c), '{}'::jsonb),
    'per_day', coalesce((select jsonb_agg(jsonb_build_object('day', cast_on, 'n', n) order by cast_on) from (
        select cast_on, count(*) n from public.vote_ballots where vote_id = _vote_id group by cast_on) d), '[]'::jsonb)
  ) into result;
  return result;
end $$;
REVOKE ALL ON FUNCTION public.vote_tally(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.vote_tally(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vote_rationales(_vote_id uuid)
RETURNS TABLE(option_key text, rationale text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  select b.option_key, b.rationale from public.vote_ballots b
  where b.vote_id = _vote_id and b.rationale is not null and not b.hidden
    and private.can_see_vote_results(_vote_id, auth.uid())
  order by b.cast_on desc, b.receipt
$$;
REVOKE ALL ON FUNCTION public.vote_rationales(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.vote_rationales(uuid) TO authenticated;

ALTER TABLE public.integration_config ADD COLUMN IF NOT EXISTS feature_votes_enabled boolean NOT NULL DEFAULT true;