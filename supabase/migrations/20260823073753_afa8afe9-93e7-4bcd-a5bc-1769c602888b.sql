-- Newsletter editions -------------------------------------------------------
CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  status public.article_status NOT NULL DEFAULT 'draft'::public.article_status,
  language text NOT NULL DEFAULT 'en',
  issue_date date NOT NULL,
  scheduled_at timestamptz,
  published_at timestamptz,
  first_published_at timestamptz,
  last_refreshed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletters_language_check CHECK (language IN ('en','de','fr','it'))
);
CREATE UNIQUE INDEX newsletters_issue_date_idx
  ON public.newsletters (issue_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletters TO authenticated;
GRANT SELECT ON public.newsletters TO anon;
GRANT ALL ON public.newsletters TO service_role;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial staff manage newsletters"
  ON public.newsletters AS permissive FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()));

CREATE POLICY "public read published newsletters"
  ON public.newsletters AS permissive FOR SELECT TO anon, authenticated
  USING (status = 'published'::public.article_status);

-- Blocks --------------------------------------------------------------------
CREATE TABLE public.newsletter_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  note text,
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_fingerprint text,
  featured_image_url text,
  generated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_blocks_type_check CHECK (block_type IN (
    'presidents_message','specific_content','advertisement','insights',
    'volunteering','organization_updates','project_updates',
    'chat_questions','europe_pulse','bad_joke','upcoming_events'
  ))
);
CREATE INDEX newsletter_blocks_order_idx
  ON public.newsletter_blocks (newsletter_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_blocks TO authenticated;
GRANT SELECT ON public.newsletter_blocks TO anon;
GRANT ALL ON public.newsletter_blocks TO service_role;
ALTER TABLE public.newsletter_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial staff manage newsletter blocks"
  ON public.newsletter_blocks AS permissive FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()));

CREATE POLICY "public read blocks of published newsletters"
  ON public.newsletter_blocks AS permissive FOR SELECT TO anon, authenticated
  USING (enabled AND EXISTS (
    SELECT 1 FROM public.newsletters n
    WHERE n.id = newsletter_blocks.newsletter_id
      AND n.status = 'published'::public.article_status
  ));

-- Brevo sending placeholder (stub, no credentials) ---------------------------
CREATE TABLE public.newsletter_send_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL UNIQUE REFERENCES public.newsletters(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'brevo',
  note text,
  is_stub boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_send_config TO authenticated;
GRANT ALL ON public.newsletter_send_config TO service_role;
ALTER TABLE public.newsletter_send_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage newsletter send config"
  ON public.newsletter_send_config AS permissive FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Scheduled job bookkeeping --------------------------------------------------
CREATE TABLE public.newsletter_jobs (
  job_key text PRIMARY KEY,
  lease_until timestamptz,
  paused boolean NOT NULL DEFAULT false,
  paused_reason text,
  last_run_at timestamptz,
  last_status text,
  last_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.newsletter_jobs TO authenticated;
GRANT ALL ON public.newsletter_jobs TO service_role;
ALTER TABLE public.newsletter_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read newsletter jobs"
  ON public.newsletter_jobs AS permissive FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

INSERT INTO public.newsletter_jobs (job_key) VALUES ('newsletter_monthly'), ('newsletter_weekly');

-- Four-eye publish guard -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_newsletters_publish_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean := private.has_role(auth.uid(), 'admin');
BEGIN
  IF NEW.status IN ('published', 'scheduled')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT is_admin AND NOT private.is_article_publisher(uid) THEN
      RAISE EXCEPTION 'only a publisher may publish a newsletter';
    END IF;
    IF NOT is_admin AND NEW.created_by IS NOT NULL AND NEW.created_by = uid THEN
      RAISE EXCEPTION 'the creator of a newsletter cannot publish it; another publisher must review it';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER newsletters_publish_guard
  BEFORE UPDATE ON public.newsletters
  FOR EACH ROW EXECUTE FUNCTION public.tg_newsletters_publish_guard();

CREATE TRIGGER newsletters_touch_updated_at
  BEFORE UPDATE ON public.newsletters
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER newsletter_blocks_touch_updated_at
  BEFORE UPDATE ON public.newsletter_blocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER newsletter_send_config_touch_updated_at
  BEFORE UPDATE ON public.newsletter_send_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();