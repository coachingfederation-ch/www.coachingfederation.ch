CREATE TABLE public.event_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('registration', 'follow_up')),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  thank_you text,
  thank_you_de text,
  thank_you_fr text,
  thank_you_it text,
  intro text,
  intro_de text,
  intro_fr text,
  intro_it text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_forms_event_idx ON public.event_forms (event_id, kind);
CREATE UNIQUE INDEX event_forms_one_active_registration
  ON public.event_forms (event_id)
  WHERE kind = 'registration' AND is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_forms TO authenticated;
GRANT SELECT ON public.event_forms TO anon;
GRANT ALL ON public.event_forms TO service_role;
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read event forms" ON public.event_forms
  FOR SELECT TO authenticated USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers write event forms" ON public.event_forms
  FOR INSERT TO authenticated WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers update event forms" ON public.event_forms
  FOR UPDATE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()))
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers delete event forms" ON public.event_forms
  FOR DELETE TO authenticated USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "public reads active registration forms" ON public.event_forms
  FOR SELECT TO anon, authenticated
  USING (
    kind = 'registration' AND is_active AND EXISTS (
      SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE TRIGGER event_forms_touch BEFORE UPDATE ON public.event_forms
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Helper: does this user manage the event behind a form?
CREATE OR REPLACE FUNCTION private.event_form_is_managed_by(_form_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_forms f
    WHERE f.id = _form_id
      AND private.event_is_managed_by(f.event_id, _uid)
  )
$$;

-- Helper: is this form an active registration form on a published event?
CREATE OR REPLACE FUNCTION private.event_form_is_public(_form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_forms f
    JOIN public.events e ON e.id = f.event_id
    WHERE f.id = _form_id
      AND f.kind = 'registration'
      AND f.is_active
      AND e.status = 'published'
  )
$$;

CREATE TABLE public.event_form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  qtype text NOT NULL DEFAULT 'short_text' CHECK (qtype IN (
    'short_text', 'long_text', 'single_choice', 'multi_choice', 'yes_no', 'rating', 'heading'
  )),
  label text NOT NULL,
  label_de text,
  label_fr text,
  label_it text,
  help_text text,
  help_text_de text,
  help_text_fr text,
  help_text_it text,
  options text[] NOT NULL DEFAULT '{}'::text[],
  rating_max integer NOT NULL DEFAULT 5 CHECK (rating_max BETWEEN 2 AND 10),
  scale_low_label text,
  scale_high_label text,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  condition_question_id uuid REFERENCES public.event_form_questions(id) ON DELETE SET NULL,
  condition_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, question_key)
);
CREATE INDEX event_form_questions_form_idx ON public.event_form_questions (form_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_form_questions TO authenticated;
GRANT SELECT ON public.event_form_questions TO anon;
GRANT ALL ON public.event_form_questions TO service_role;
ALTER TABLE public.event_form_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read form questions" ON public.event_form_questions
  FOR SELECT TO authenticated USING (private.event_form_is_managed_by(form_id, auth.uid()));
CREATE POLICY "managers write form questions" ON public.event_form_questions
  FOR INSERT TO authenticated WITH CHECK (private.event_form_is_managed_by(form_id, auth.uid()));
CREATE POLICY "managers update form questions" ON public.event_form_questions
  FOR UPDATE TO authenticated
  USING (private.event_form_is_managed_by(form_id, auth.uid()))
  WITH CHECK (private.event_form_is_managed_by(form_id, auth.uid()));
CREATE POLICY "managers delete form questions" ON public.event_form_questions
  FOR DELETE TO authenticated USING (private.event_form_is_managed_by(form_id, auth.uid()));
CREATE POLICY "public reads public form questions" ON public.event_form_questions
  FOR SELECT TO anon, authenticated USING (private.event_form_is_public(form_id));

CREATE TRIGGER event_form_questions_touch BEFORE UPDATE ON public.event_form_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.event_form_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  email text NOT NULL,
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'de', 'fr', 'it')),
  token_hash text,
  status text NOT NULL DEFAULT 'not_sent' CHECK (status IN ('not_sent', 'sent', 'completed')),
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  send_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, registration_id)
);
CREATE INDEX event_form_recipients_token_idx ON public.event_form_recipients (token_hash);
CREATE INDEX event_form_recipients_form_idx ON public.event_form_recipients (form_id, status);

-- Staff read only; the token hash and all writes stay server-side.
GRANT SELECT ON public.event_form_recipients TO authenticated;
GRANT ALL ON public.event_form_recipients TO service_role;
ALTER TABLE public.event_form_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read form recipients" ON public.event_form_recipients
  FOR SELECT TO authenticated USING (private.event_form_is_managed_by(form_id, auth.uid()));

CREATE TRIGGER event_form_recipients_touch BEFORE UPDATE ON public.event_form_recipients
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.event_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.event_form_recipients(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, registration_id)
);
CREATE INDEX event_form_responses_form_idx ON public.event_form_responses (form_id, submitted_at);

GRANT SELECT ON public.event_form_responses TO authenticated;
GRANT ALL ON public.event_form_responses TO service_role;
ALTER TABLE public.event_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read form responses" ON public.event_form_responses
  FOR SELECT TO authenticated USING (private.event_form_is_managed_by(form_id, auth.uid()));

-- Move existing registration questions into the new structure, keeping keys.
INSERT INTO public.event_forms (event_id, kind, name, is_active)
SELECT DISTINCT f.event_id, 'registration', 'Registration questions', true
FROM public.event_registration_fields f;

INSERT INTO public.event_form_questions (
  form_id, question_key, qtype, label, label_de, label_fr, label_it,
  options, is_required, sort_order
)
SELECT nf.id,
       f.field_key,
       CASE WHEN f.field_type = 'checkbox' THEN 'yes_no' ELSE f.field_type END,
       f.label, f.label_de, f.label_fr, f.label_it,
       f.options, f.is_required, f.sort_order
FROM public.event_registration_fields f
JOIN public.event_forms nf ON nf.event_id = f.event_id AND nf.kind = 'registration'
WHERE f.is_active;

DROP VIEW IF EXISTS public.event_registration_fields_public;
DROP TABLE public.event_registration_fields;

CREATE VIEW public.event_forms_public
WITH (security_invoker = on) AS
  SELECT f.id, f.event_id, f.kind, f.thank_you, f.thank_you_de, f.thank_you_fr, f.thank_you_it
  FROM public.event_forms f
  JOIN public.events e ON e.id = f.event_id
  WHERE f.kind = 'registration' AND f.is_active AND e.status = 'published';

CREATE VIEW public.event_form_questions_public
WITH (security_invoker = on) AS
  SELECT q.id, q.form_id, f.event_id, q.question_key, q.qtype,
         q.label, q.label_de, q.label_fr, q.label_it,
         q.help_text, q.help_text_de, q.help_text_fr, q.help_text_it,
         q.options, q.rating_max, q.scale_low_label, q.scale_high_label,
         q.is_required, q.sort_order, q.condition_question_id, q.condition_value
  FROM public.event_form_questions q
  JOIN public.event_forms f ON f.id = q.form_id
  JOIN public.events e ON e.id = f.event_id
  WHERE f.kind = 'registration' AND f.is_active AND e.status = 'published';

GRANT SELECT ON public.event_forms_public TO anon, authenticated;
GRANT SELECT ON public.event_form_questions_public TO anon, authenticated;