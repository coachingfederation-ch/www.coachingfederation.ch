-- Edition-level translations (title + mail subject) -------------------------
CREATE TABLE public.newsletter_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  manually_edited boolean NOT NULL DEFAULT false,
  source_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_translations_locale_check CHECK (locale IN ('en','de','fr','it')),
  CONSTRAINT newsletter_translations_unique UNIQUE (newsletter_id, locale)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_translations TO authenticated;
GRANT SELECT ON public.newsletter_translations TO anon;
GRANT ALL ON public.newsletter_translations TO service_role;
ALTER TABLE public.newsletter_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial staff manage newsletter translations"
  ON public.newsletter_translations AS permissive FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()));

CREATE POLICY "public read translations of published newsletters"
  ON public.newsletter_translations AS permissive FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.newsletters n
    WHERE n.id = newsletter_translations.newsletter_id
      AND n.status = 'published'::public.article_status
  ));

CREATE TRIGGER newsletter_translations_touch_updated_at
  BEFORE UPDATE ON public.newsletter_translations
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Block-level translations ---------------------------------------------------
CREATE TABLE public.newsletter_block_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.newsletter_blocks(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  image_alt text,
  manually_edited boolean NOT NULL DEFAULT false,
  source_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_block_translations_locale_check CHECK (locale IN ('en','de','fr','it')),
  CONSTRAINT newsletter_block_translations_unique UNIQUE (block_id, locale)
);

CREATE INDEX newsletter_block_translations_locale_idx
  ON public.newsletter_block_translations (locale);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_block_translations TO authenticated;
GRANT SELECT ON public.newsletter_block_translations TO anon;
GRANT ALL ON public.newsletter_block_translations TO service_role;
ALTER TABLE public.newsletter_block_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial staff manage newsletter block translations"
  ON public.newsletter_block_translations AS permissive FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()));

CREATE POLICY "public read block translations of published newsletters"
  ON public.newsletter_block_translations AS permissive FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.newsletter_blocks b
    JOIN public.newsletters n ON n.id = b.newsletter_id
    WHERE b.id = newsletter_block_translations.block_id
      AND b.enabled
      AND n.status = 'published'::public.article_status
  ));

CREATE TRIGGER newsletter_block_translations_touch_updated_at
  BEFORE UPDATE ON public.newsletter_block_translations
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Per-language delivery ------------------------------------------------------
ALTER TABLE public.newsletter_send_config
  ADD COLUMN locale text NOT NULL DEFAULT 'en';

UPDATE public.newsletter_send_config c
  SET locale = COALESCE(n.language, 'en')
  FROM public.newsletters n
  WHERE n.id = c.newsletter_id;

ALTER TABLE public.newsletter_send_config
  ADD CONSTRAINT newsletter_send_config_locale_check CHECK (locale IN ('en','de','fr','it'));

ALTER TABLE public.newsletter_send_config
  DROP CONSTRAINT IF EXISTS newsletter_send_config_newsletter_id_key;

ALTER TABLE public.newsletter_send_config
  ADD CONSTRAINT newsletter_send_config_newsletter_locale_key UNIQUE (newsletter_id, locale);