ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS published_by uuid;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_published_by_fkey
  FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tg_articles_publish_guard()
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
      RAISE EXCEPTION 'only a Communication & Marketing publisher may publish an article';
    END IF;
    IF NOT is_admin AND NEW.created_by IS NOT NULL AND NEW.created_by = uid THEN
      RAISE EXCEPTION 'the creator of an article cannot publish it; another publisher must review it';
    END IF;
    -- The releaser is derived from the session, never trusted from the client.
    NEW.published_by := coalesce(uid, OLD.published_by);
  ELSE
    NEW.published_by := OLD.published_by;
  END IF;
  RETURN NEW;
END;
$function$
;