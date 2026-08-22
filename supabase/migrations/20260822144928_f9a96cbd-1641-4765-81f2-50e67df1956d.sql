ALTER TABLE public.event_form_questions
  ADD COLUMN IF NOT EXISTS options_de text[],
  ADD COLUMN IF NOT EXISTS options_fr text[],
  ADD COLUMN IF NOT EXISTS options_it text[],
  ADD COLUMN IF NOT EXISTS scale_low_label_de text,
  ADD COLUMN IF NOT EXISTS scale_low_label_fr text,
  ADD COLUMN IF NOT EXISTS scale_low_label_it text,
  ADD COLUMN IF NOT EXISTS scale_high_label_de text,
  ADD COLUMN IF NOT EXISTS scale_high_label_fr text,
  ADD COLUMN IF NOT EXISTS scale_high_label_it text;

DROP VIEW IF EXISTS public.event_form_questions_public;

CREATE VIEW public.event_form_questions_public
WITH (security_invoker = true) AS
 SELECT q.id,
    q.form_id,
    f.event_id,
    q.question_key,
    q.qtype,
    q.label,
    q.label_de,
    q.label_fr,
    q.label_it,
    q.help_text,
    q.help_text_de,
    q.help_text_fr,
    q.help_text_it,
    q.options,
    q.options_de,
    q.options_fr,
    q.options_it,
    q.rating_max,
    q.scale_low_label,
    q.scale_low_label_de,
    q.scale_low_label_fr,
    q.scale_low_label_it,
    q.scale_high_label,
    q.scale_high_label_de,
    q.scale_high_label_fr,
    q.scale_high_label_it,
    q.is_required,
    q.sort_order,
    q.condition_question_id,
    q.condition_value
   FROM event_form_questions q
     JOIN event_forms f ON f.id = q.form_id
     JOIN events e ON e.id = f.event_id
  WHERE f.kind = 'registration'::text AND f.is_active AND e.status = 'published'::event_status;

GRANT SELECT ON public.event_form_questions_public TO anon, authenticated;
GRANT ALL ON public.event_form_questions_public TO service_role;