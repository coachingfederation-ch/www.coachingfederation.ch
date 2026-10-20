CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  max_responses integer CHECK (max_responses IS NULL OR max_responses > 0),
  collect_contact boolean NOT NULL DEFAULT false,
  one_per_browser boolean NOT NULL DEFAULT false,
  intro text, intro_de text, intro_fr text, intro_it text,
  thank_you text, thank_you_de text, thank_you_fr text, thank_you_it text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event staff manage surveys" ON public.surveys
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'))
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'));
CREATE TRIGGER surveys_touch BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_name text,
  contact_email text,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX survey_responses_survey_idx ON public.survey_responses(survey_id, created_at);
GRANT SELECT, DELETE ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event staff read survey responses" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'));
CREATE POLICY "event staff delete survey responses" ON public.survey_responses
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'));