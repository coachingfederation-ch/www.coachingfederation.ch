ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
UPDATE public.events e SET created_by = e.organizer_id WHERE e.created_by IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = e.organizer_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON public.events(created_by);
CREATE OR REPLACE FUNCTION public.tg_events_authorship() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
    NEW.updated_by := NULL;
  ELSE
    NEW.created_by := OLD.created_by;
    IF auth.uid() IS NOT NULL THEN NEW.updated_by := auth.uid(); ELSE NEW.updated_by := OLD.updated_by; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS events_authorship ON public.events;
CREATE TRIGGER events_authorship BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.tg_events_authorship();