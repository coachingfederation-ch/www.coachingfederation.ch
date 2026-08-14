CREATE TYPE public.chat_answer_outcome AS ENUM ('successful', 'partially_successful', 'escalated', 'unsuccessful', 'unknown');
CREATE TYPE public.chat_feedback AS ENUM ('helpful', 'not_helpful');

CREATE TABLE public.chat_question_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_de text NOT NULL DEFAULT '',
  label_fr text NOT NULL DEFAULT '',
  label_it text NOT NULL DEFAULT '',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_question_categories TO authenticated;
GRANT ALL ON public.chat_question_categories TO service_role;
ALTER TABLE public.chat_question_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read chat categories" ON public.chat_question_categories
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage chat categories" ON public.chat_question_categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER chat_question_categories_touch
  BEFORE UPDATE ON public.chat_question_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

INSERT INTO public.chat_question_categories (slug, label_en, label_de, label_fr, label_it, sort_order) VALUES
  ('membership', 'Membership', 'Mitgliedschaft', 'Adhésion', 'Adesione', 10),
  ('membership_application', 'Membership application', 'Antrag auf Mitgliedschaft', 'Demande d''adhésion', 'Domanda di adesione', 20),
  ('membership_renewal', 'Membership renewal', 'Verlängerung der Mitgliedschaft', 'Renouvellement d''adhésion', 'Rinnovo dell''adesione', 30),
  ('credentialing', 'Credentialing', 'Credentialing', 'Accréditation', 'Accreditamento', 40),
  ('coach_search', 'Coach search', 'Coach-Suche', 'Recherche de coach', 'Ricerca di un coach', 50),
  ('events', 'Events', 'Events', 'Événements', 'Eventi', 60),
  ('education_training', 'Education and training', 'Aus- und Weiterbildung', 'Formation', 'Formazione', 70),
  ('resources', 'Resources', 'Ressourcen', 'Ressources', 'Risorse', 80),
  ('chapter_information', 'ICF Switzerland / chapter information', 'ICF Schweiz / Chapter-Informationen', 'ICF Suisse / informations sur le chapitre', 'ICF Svizzera / informazioni sul chapter', 90),
  ('website_support', 'Website or technical support', 'Website oder technischer Support', 'Site web ou support technique', 'Sito web o supporto tecnico', 100),
  ('contact_request', 'Contact request', 'Kontaktanfrage', 'Demande de contact', 'Richiesta di contatto', 110),
  ('other', 'Other', 'Anderes', 'Autre', 'Altro', 120);

CREATE TABLE public.chat_interaction_logs (
  id uuid PRIMARY KEY,
  session_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  category_slug text NOT NULL DEFAULT 'other',
  category_detail text,
  locale text NOT NULL DEFAULT 'en',
  outcome public.chat_answer_outcome NOT NULL DEFAULT 'unknown',
  contact_shown boolean NOT NULL DEFAULT false,
  contact_clicked boolean NOT NULL DEFAULT false,
  escalation_reason text,
  feedback public.chat_feedback,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chat_interaction_logs TO authenticated;
GRANT ALL ON public.chat_interaction_logs TO service_role;
ALTER TABLE public.chat_interaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read chat interaction logs" ON public.chat_interaction_logs
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER chat_interaction_logs_touch
  BEFORE UPDATE ON public.chat_interaction_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX chat_interaction_logs_occurred_at_idx ON public.chat_interaction_logs (occurred_at DESC);
CREATE INDEX chat_interaction_logs_category_idx ON public.chat_interaction_logs (category_slug);
CREATE INDEX chat_interaction_logs_outcome_idx ON public.chat_interaction_logs (outcome);