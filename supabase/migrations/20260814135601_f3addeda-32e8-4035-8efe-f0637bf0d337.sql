CREATE TYPE public.assistant_knowledge_kind AS ENUM ('faq', 'note');

CREATE TABLE public.assistant_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.assistant_knowledge_kind NOT NULL DEFAULT 'faq',
  title text NOT NULL,
  body text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  link_path text,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assistant_knowledge_published_idx
  ON public.assistant_knowledge (is_published, updated_at DESC);

GRANT SELECT ON public.assistant_knowledge TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_knowledge TO authenticated;
GRANT ALL ON public.assistant_knowledge TO service_role;

ALTER TABLE public.assistant_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published knowledge is readable"
  ON public.assistant_knowledge
  FOR SELECT
  TO anon, authenticated
  USING (is_published);

CREATE POLICY "Admins manage knowledge"
  ON public.assistant_knowledge
  FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER assistant_knowledge_touch
  BEFORE UPDATE ON public.assistant_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();