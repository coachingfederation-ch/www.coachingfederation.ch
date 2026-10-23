ALTER TABLE public.surveys ADD COLUMN members_only boolean NOT NULL DEFAULT false;

CREATE TABLE public.survey_participations (
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  participated_on date NOT NULL DEFAULT current_date,
  PRIMARY KEY (survey_id, member_id)
);
COMMENT ON TABLE public.survey_participations IS 'Who answered a members-only survey (one per member). Deliberately not linked to survey_responses so answers stay anonymous.';
GRANT ALL ON public.survey_participations TO service_role;
ALTER TABLE public.survey_participations ENABLE ROW LEVEL SECURITY;