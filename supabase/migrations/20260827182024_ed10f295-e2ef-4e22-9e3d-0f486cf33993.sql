-- 1. Per-event minimum attendance -------------------------------------------
ALTER TABLE public.events
  ADD COLUMN attendance_min_percent int NOT NULL DEFAULT 80
  CHECK (attendance_min_percent BETWEEN 1 AND 100);

-- 2. Enums --------------------------------------------------------------------
CREATE TYPE public.event_attendance_provider AS ENUM ('zoom', 'google_meet', 'other');
CREATE TYPE public.event_attendance_import_status AS ENUM ('uploaded', 'previewed', 'applied', 'discarded');
CREATE TYPE public.event_attendance_match_method AS ENUM ('email', 'manual', 'none');
CREATE TYPE public.event_attendance_apply_decision AS ENUM ('pending', 'check_in', 'skip');

-- 3. Imports -------------------------------------------------------------------
CREATE TABLE public.event_attendance_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  provider public.event_attendance_provider NOT NULL,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  status public.event_attendance_import_status NOT NULL DEFAULT 'uploaded',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NULL
);

GRANT SELECT, INSERT ON public.event_attendance_imports TO authenticated;
GRANT UPDATE (status) ON public.event_attendance_imports TO authenticated;
GRANT ALL ON public.event_attendance_imports TO service_role;

ALTER TABLE public.event_attendance_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event managers read attendance imports"
  ON public.event_attendance_imports FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "Event managers create attendance imports"
  ON public.event_attendance_imports FOR INSERT TO authenticated
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()) AND uploaded_by = auth.uid());

-- Staff may only move an import's status (e.g. discard); apply is done by the
-- security-definer routine below.
CREATE POLICY "Event managers update attendance imports"
  ON public.event_attendance_imports FOR UPDATE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()) AND status <> 'applied')
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));

CREATE INDEX event_attendance_imports_event_idx
  ON public.event_attendance_imports (event_id, created_at DESC);

-- 4. Import rows ---------------------------------------------------------------
CREATE TABLE public.event_attendance_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.event_attendance_imports(id) ON DELETE CASCADE,
  raw_name text NULL,
  raw_email text NULL,
  joined_at timestamptz NULL,
  left_at timestamptz NULL,
  duration_minutes numeric(8,2) NULL,
  match_registration_id uuid NULL REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  match_method public.event_attendance_match_method NOT NULL DEFAULT 'none',
  apply_decision public.event_attendance_apply_decision NOT NULL DEFAULT 'pending',
  skip_reason text NULL
);

GRANT SELECT ON public.event_attendance_import_rows TO authenticated;
GRANT UPDATE (match_registration_id, match_method, apply_decision, skip_reason)
  ON public.event_attendance_import_rows TO authenticated;
GRANT ALL ON public.event_attendance_import_rows TO service_role;

ALTER TABLE public.event_attendance_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event managers read attendance import rows"
  ON public.event_attendance_import_rows FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_attendance_imports i
     WHERE i.id = import_id
       AND private.event_is_managed_by(i.event_id, auth.uid())
  ));

-- Rows are frozen once the import has been applied.
CREATE POLICY "Event managers update attendance import rows"
  ON public.event_attendance_import_rows FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_attendance_imports i
     WHERE i.id = import_id
       AND i.status NOT IN ('applied', 'discarded')
       AND private.event_is_managed_by(i.event_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_attendance_imports i
     WHERE i.id = import_id
       AND private.event_is_managed_by(i.event_id, auth.uid())
  ));

CREATE INDEX event_attendance_import_rows_import_idx
  ON public.event_attendance_import_rows (import_id);

-- 5. Apply routine --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_attendance_import(_import_id uuid, _actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  imp public.event_attendance_imports%ROWTYPE;
  row_rec record;
  reg public.event_registrations%ROWTYPE;
  checked_in int := 0;
  already int := 0;
  skipped int := 0;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO imp FROM public.event_attendance_imports
    WHERE id = _import_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF NOT private.event_is_managed_by(imp.event_id, _actor) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;

  IF imp.status = 'discarded' THEN
    RETURN jsonb_build_object('outcome', 'discarded');
  END IF;

  -- Re-applying is a no-op that answers with the recorded result.
  IF imp.status = 'applied' THEN
    RETURN jsonb_build_object('outcome', 'applied') || coalesce(imp.stats, '{}'::jsonb);
  END IF;

  FOR row_rec IN
    SELECT * FROM public.event_attendance_import_rows
     WHERE import_id = imp.id
       AND apply_decision = 'check_in'
       AND match_registration_id IS NOT NULL
  LOOP
    SELECT * INTO reg FROM public.event_registrations
      WHERE id = row_rec.match_registration_id FOR UPDATE;

    IF NOT FOUND OR reg.event_id <> imp.event_id THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Preview is never trusted: eligibility is decided here, at write time.
    IF private.registration_is_check_in_eligible(reg) IS NOT NULL THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    IF reg.checked_in_at IS NOT NULL THEN
      already := already + 1;
      CONTINUE;
    END IF;

    UPDATE public.event_registrations
       SET checked_in_at = now(),
           checked_in_by = _actor,
           checked_in_source = 'import'
     WHERE id = reg.id AND checked_in_at IS NULL;

    UPDATE public.guest_passes
       SET status = 'attended'
     WHERE registration_id = reg.id
       AND status IN ('approved', 'registered');

    checked_in := checked_in + 1;
  END LOOP;

  UPDATE public.event_attendance_imports
     SET status = 'applied',
         stats = coalesce(stats, '{}'::jsonb) || jsonb_build_object(
           'checked_in', checked_in,
           'already', already,
           'skipped', skipped
         )
   WHERE id = imp.id;

  RETURN jsonb_build_object(
    'outcome', 'applied',
    'checked_in', checked_in,
    'already', already,
    'skipped', skipped
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_attendance_import(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_attendance_import(uuid, uuid) TO service_role;

-- 6. Private bucket access: staff who manage the event named by the first
--    path segment. Bucket row itself is created with the storage tool.
CREATE POLICY "Attendance import files managed by event staff"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'event-attendance-imports'
    AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    AND private.event_is_managed_by(split_part(name, '/', 1)::uuid, auth.uid())
  )
  WITH CHECK (
    bucket_id = 'event-attendance-imports'
    AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    AND private.event_is_managed_by(split_part(name, '/', 1)::uuid, auth.uid())
  );