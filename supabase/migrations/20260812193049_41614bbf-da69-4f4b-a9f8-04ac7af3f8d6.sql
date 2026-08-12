-- 1. Status vocabulary -------------------------------------------------------
CREATE TYPE public.event_cce_status AS ENUM (
  'not_requested',
  'draft',
  'missing_information',
  'ready_for_review',
  'submitted',
  'approved',
  'declined',
  'not_required_rd_only',
  'separate_conference_process'
);

CREATE TYPE public.event_cce_delivery AS ENUM ('in_person', 'teleclass', 'webinar');

CREATE TYPE public.event_cce_category AS ENUM ('core_competency', 'resource_development', 'break');

-- 2. Event-level flags -------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN cce_enabled boolean NOT NULL DEFAULT false,
  -- Denormalised, written only by the trigger below, so the public
  -- (security_invoker) events_public view can show approved units without
  -- granting anon any access to the application itself.
  ADD COLUMN cce_approved_cc_hours numeric(5,2),
  ADD COLUMN cce_approved_rd_hours numeric(5,2);

-- 3. Applications ------------------------------------------------------------
CREATE TABLE public.event_cce_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  status public.event_cce_status NOT NULL DEFAULT 'draft',

  contact_name text,
  contact_email text,
  primary_facilitator_name text,
  primary_facilitator_credential text,
  additional_facilitators text,
  delivery_method public.event_cce_delivery,

  target_audience text,
  learning_objectives text,
  completion_requirements text,
  attendance_monitoring text,
  content_rationale text,

  core_competency_hours numeric(5,2) NOT NULL DEFAULT 0,
  resource_development_hours numeric(5,2) NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,

  supporting_material_url text,
  supporting_material_note text,
  internal_notes text,

  submitted_at date,
  jotform_reference text,
  submitted_by uuid,
  decision_at date,
  approved_cc_hours numeric(5,2),
  approved_rd_hours numeric(5,2),
  decision_notes text,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_cce_applications TO authenticated;
GRANT ALL ON public.event_cce_applications TO service_role;

ALTER TABLE public.event_cce_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read cce applications"
  ON public.event_cce_applications FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "managers write cce applications"
  ON public.event_cce_applications FOR INSERT TO authenticated
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "managers update cce applications"
  ON public.event_cce_applications FOR UPDATE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()))
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "managers delete cce applications"
  ON public.event_cce_applications FOR DELETE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));

-- 4. Schedule rows -----------------------------------------------------------
CREATE TABLE public.event_cce_schedule_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.event_cce_applications(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  starts_at_text text,
  ends_at_text text,
  duration_minutes integer NOT NULL DEFAULT 0,
  facilitator text,
  topic text,
  delivery_method public.event_cce_delivery,
  cce_category public.event_cce_category NOT NULL DEFAULT 'core_competency',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_cce_schedule_rows_application_idx
  ON public.event_cce_schedule_rows (application_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_cce_schedule_rows TO authenticated;
GRANT ALL ON public.event_cce_schedule_rows TO service_role;

ALTER TABLE public.event_cce_schedule_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers read cce schedule"
  ON public.event_cce_schedule_rows FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_cce_applications a
     WHERE a.id = application_id
       AND private.event_is_managed_by(a.event_id, auth.uid())
  ));

CREATE POLICY "managers write cce schedule"
  ON public.event_cce_schedule_rows FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_cce_applications a
     WHERE a.id = application_id
       AND private.event_is_managed_by(a.event_id, auth.uid())
  ));

CREATE POLICY "managers update cce schedule"
  ON public.event_cce_schedule_rows FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_cce_applications a
     WHERE a.id = application_id
       AND private.event_is_managed_by(a.event_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_cce_applications a
     WHERE a.id = application_id
       AND private.event_is_managed_by(a.event_id, auth.uid())
  ));

CREATE POLICY "managers delete cce schedule"
  ON public.event_cce_schedule_rows FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_cce_applications a
     WHERE a.id = application_id
       AND private.event_is_managed_by(a.event_id, auth.uid())
  ));

-- 5. Approver boundary + public mirror --------------------------------------
CREATE OR REPLACE FUNCTION public.tg_event_cce_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  approver boolean := uid IS NOT NULL AND private.is_editor(uid);
  approver_states public.event_cce_status[] :=
    ARRAY['submitted', 'approved', 'declined']::public.event_cce_status[];
BEGIN
  NEW.updated_at = now();

  -- Only an editor/admin may move an application into an official state, or
  -- change the recorded submission and decision facts.
  IF NOT trusted AND NOT approver THEN
    IF NEW.status = ANY (approver_states)
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      RAISE EXCEPTION 'only an editor or admin may submit, approve or decline a CCE application';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      NEW.submitted_at = OLD.submitted_at;
      NEW.jotform_reference = OLD.jotform_reference;
      NEW.submitted_by = OLD.submitted_by;
      NEW.decision_at = OLD.decision_at;
      NEW.approved_cc_hours = OLD.approved_cc_hours;
      NEW.approved_rd_hours = OLD.approved_rd_hours;
      NEW.decision_notes = OLD.decision_notes;
    ELSE
      NEW.submitted_at = NULL;
      NEW.jotform_reference = NULL;
      NEW.submitted_by = NULL;
      NEW.decision_at = NULL;
      NEW.approved_cc_hours = NULL;
      NEW.approved_rd_hours = NULL;
      NEW.decision_notes = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER event_cce_guard
  BEFORE INSERT OR UPDATE ON public.event_cce_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_event_cce_guard();

CREATE OR REPLACE FUNCTION public.tg_event_cce_sync_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.events
       SET cce_approved_cc_hours = NULL, cce_approved_rd_hours = NULL
     WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'approved' THEN
    UPDATE public.events
       SET cce_approved_cc_hours = NEW.approved_cc_hours,
           cce_approved_rd_hours = NEW.approved_rd_hours
     WHERE id = NEW.event_id;
  ELSE
    UPDATE public.events
       SET cce_approved_cc_hours = NULL, cce_approved_rd_hours = NULL
     WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_cce_sync_public
  AFTER INSERT OR UPDATE OR DELETE ON public.event_cce_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_event_cce_sync_public();

-- 6. Public view gains the approved units ------------------------------------
CREATE OR REPLACE VIEW public.events_public AS
 SELECT e.id,
    e.slug,
    e.title,
    e.summary,
    e.description,
    e.language,
    e.image_url,
    e.image_credit_name,
    e.image_credit_url,
    e.starts_at,
    e.ends_at,
    e.timezone,
    e.location_mode,
    e.venue_name,
    e.city,
    e.online_url,
    e.is_featured,
    e.registration_mode,
    e.capacity,
    e.guest_registration_allowed,
    e.registration_opens_at,
    e.registration_closes_at,
    private.event_confirmed_count(e.id) AS registration_count,
        CASE
            WHEN e.capacity IS NULL THEN NULL::integer
            ELSE GREATEST(e.capacity - private.event_confirmed_count(e.id), 0)
        END AS seats_remaining,
    e.capacity IS NOT NULL AND private.event_confirmed_count(e.id) >= e.capacity AS is_full,
    e.registration_mode <> 'none'::event_registration_mode AND (e.registration_opens_at IS NULL OR now() >= e.registration_opens_at) AND
        CASE
            WHEN e.registration_closes_at IS NOT NULL THEN now() <= e.registration_closes_at
            ELSE now() <= COALESCE(e.ends_at, e.starts_at)
        END AND (e.capacity IS NULL OR private.event_confirmed_count(e.id) < e.capacity) AS registration_open,
    c.slug AS category_slug,
    c.name AS category_name,
    r.slug AS region_slug,
    r.name AS region_name,
    e.published_at,
    e.updated_at,
    e.map_location,
    com.id AS community_id,
    com.slug AS community_slug,
    com.name AS community_name,
    e.hero_marks,
    e.cce_approved_cc_hours,
    e.cce_approved_rd_hours
   FROM events e
     LEFT JOIN cf_event_categories c ON c.id = e.category_id
     LEFT JOIN cf_regions r ON r.id = e.region_id
     LEFT JOIN op_projects com ON com.id = e.community_id AND com.is_community
  WHERE e.status = 'published'::event_status;