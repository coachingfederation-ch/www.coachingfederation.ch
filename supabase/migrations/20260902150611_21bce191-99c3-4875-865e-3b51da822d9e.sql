CREATE TABLE public.article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en',
  depth smallint NOT NULL CHECK (depth BETWEEN 1 AND 5),
  usefulness smallint NOT NULL CHECK (usefulness BETWEEN 1 AND 5),
  topics text[] NOT NULL DEFAULT '{}',
  comment text,
  email text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX article_feedback_article_idx ON public.article_feedback (article_id, created_at DESC);
CREATE INDEX article_feedback_created_idx ON public.article_feedback (created_at DESC);

GRANT INSERT ON public.article_feedback TO anon, authenticated;
GRANT ALL ON public.article_feedback TO service_role;

ALTER TABLE public.article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone may submit article feedback"
  ON public.article_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TABLE public.article_feedback_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_feedback_themes_scope_ck CHECK (scope IN ('article', 'chapter')),
  CONSTRAINT article_feedback_themes_article_ck CHECK (
    (scope = 'article' AND article_id IS NOT NULL) OR (scope = 'chapter' AND article_id IS NULL)
  )
);

CREATE UNIQUE INDEX article_feedback_themes_article_uq
  ON public.article_feedback_themes (article_id) WHERE scope = 'article';
CREATE UNIQUE INDEX article_feedback_themes_chapter_uq
  ON public.article_feedback_themes ((scope)) WHERE scope = 'chapter';

GRANT ALL ON public.article_feedback_themes TO service_role;

ALTER TABLE public.article_feedback_themes ENABLE ROW LEVEL SECURITY;