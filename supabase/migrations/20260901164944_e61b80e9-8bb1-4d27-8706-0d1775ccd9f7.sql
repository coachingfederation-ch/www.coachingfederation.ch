CREATE TABLE public.cf_cadences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_de text,
  name_fr text,
  name_it text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cf_cadences TO authenticated;
GRANT SELECT ON public.cf_cadences TO anon;
GRANT ALL ON public.cf_cadences TO service_role;

ALTER TABLE public.cf_cadences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_cadences anon read active" ON public.cf_cadences
  FOR SELECT TO anon USING (is_active);

CREATE POLICY "cf_cadences authenticated read" ON public.cf_cadences
  FOR SELECT TO authenticated USING (is_active OR private.is_platform_admin(auth.uid()));

CREATE POLICY "cf_cadences platform admins write" ON public.cf_cadences
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

CREATE TRIGGER cf_cadences_touch_updated_at
  BEFORE UPDATE ON public.cf_cadences
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

INSERT INTO public.cf_cadences (slug, name, name_de, name_fr, name_it, sort_order) VALUES
  ('weekly', 'Weekly', 'Wöchentlich', 'Chaque semaine', 'Settimanale', 10),
  ('bi-weekly', 'Bi-weekly', 'Alle zwei Wochen', 'Toutes les deux semaines', 'Ogni due settimane', 20),
  ('monthly', 'Monthly', 'Monatlich', 'Chaque mois', 'Mensile', 30),
  ('bi-monthly', 'Bi-monthly', 'Alle zwei Monate', 'Tous les deux mois', 'Ogni due mesi', 40),
  ('quarterly', 'Quarterly', 'Vierteljährlich', 'Chaque trimestre', 'Trimestrale', 50);

ALTER TABLE public.op_projects ADD COLUMN cadence_slug text
  REFERENCES public.cf_cadences(slug) ON UPDATE CASCADE ON DELETE SET NULL;

GRANT SELECT (cadence_slug), UPDATE (cadence_slug) ON public.op_projects TO authenticated;

-- The public site keeps reading the four cadence_note columns (they are part of
-- the team_projects_public view); they are now derived from the vocabulary.
CREATE OR REPLACE FUNCTION public.tg_op_projects_sync_cadence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.cf_cadences%ROWTYPE;
BEGIN
  IF NEW.cadence_slug IS NULL THEN
    NEW.cadence_note := NULL;
    NEW.cadence_note_de := NULL;
    NEW.cadence_note_fr := NULL;
    NEW.cadence_note_it := NULL;
  ELSE
    SELECT * INTO v FROM public.cf_cadences WHERE slug = NEW.cadence_slug;
    IF FOUND THEN
      NEW.cadence_note := v.name;
      NEW.cadence_note_de := v.name_de;
      NEW.cadence_note_fr := v.name_fr;
      NEW.cadence_note_it := v.name_it;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER op_projects_sync_cadence
  BEFORE INSERT OR UPDATE OF cadence_slug ON public.op_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_op_projects_sync_cadence();

-- Renaming a cadence keeps the community labels in step.
CREATE OR REPLACE FUNCTION public.tg_cf_cadences_propagate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.op_projects
     SET cadence_note = NEW.name,
         cadence_note_de = NEW.name_de,
         cadence_note_fr = NEW.name_fr,
         cadence_note_it = NEW.name_it
   WHERE cadence_slug = NEW.slug;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cf_cadences_propagate
  AFTER UPDATE ON public.cf_cadences
  FOR EACH ROW EXECUTE FUNCTION public.tg_cf_cadences_propagate();

-- Backfill: match the existing free-text notes onto the new entries.
UPDATE public.op_projects p
   SET cadence_slug = c.slug
  FROM public.cf_cadences c
 WHERE p.cadence_note IS NOT NULL
   AND lower(btrim(p.cadence_note)) IN (lower(c.name), lower(replace(c.name, '-', ' ')))
   AND p.cadence_slug IS NULL;

UPDATE public.op_projects
   SET cadence_slug = 'monthly'
 WHERE cadence_slug IS NULL
   AND lower(btrim(coalesce(cadence_note, ''))) IN ('once a month', 'monthly');

-- Anything that did not match loses its stale per-language text; an admin
-- picks the right entry from the dropdown.
UPDATE public.op_projects
   SET cadence_note = NULL, cadence_note_de = NULL,
       cadence_note_fr = NULL, cadence_note_it = NULL
 WHERE cadence_slug IS NULL;