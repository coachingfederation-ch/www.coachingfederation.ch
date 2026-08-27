-- 1. Per-event toggle -------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS guest_passes_allowed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.events_public WITH (security_invoker=on) AS
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
    e.is_internal,
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
    e.registration_mode <> 'none'::event_registration_mode AND (e.registration_opens_at IS NULL OR now() >= e.registration_opens_at) AND (e.registration_closes_at IS NULL OR now() <= e.registration_closes_at) AND (e.capacity IS NULL OR private.event_confirmed_count(e.id) < e.capacity) AS registration_open,
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
    e.cce_approved_rd_hours,
    e.guest_passes_allowed
   FROM events e
     LEFT JOIN cf_event_categories c ON c.id = e.category_id
     LEFT JOIN cf_regions r ON r.id = e.region_id
     LEFT JOIN op_projects com ON com.id = e.community_id AND com.is_community
  WHERE e.status = 'published'::event_status;

GRANT SELECT ON public.events_public TO anon;
GRANT SELECT ON public.events_public TO authenticated;
GRANT ALL ON public.events_public TO service_role;

-- 2. Membership & Engagement helper -----------------------------------------
CREATE OR REPLACE FUNCTION private.is_membership_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'admin'::public.app_role)
      OR private.has_role(_user_id, 'administrator'::public.app_role)
      OR private.has_role(_user_id, 'membership'::public.app_role)
$$;

-- 3. Guest passes -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  inviting_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  inviting_member_name text,
  inviting_member_email text,
  inviting_member_cst_recno text,
  inviting_member_status text,
  guest_full_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  guest_location text NOT NULL,
  guest_preferred_language text CHECK (guest_preferred_language IN ('en','de','fr','it')),
  guest_coaching_level text,
  guest_professional_focus text,
  guest_other_associations text,
  guest_notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','registered','cancelled','attended')),
  decision_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_at timestamptz,
  decision_note text,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  follow_up_status text NOT NULL DEFAULT 'none'
    CHECK (follow_up_status IN ('none','contacted','converted','closed')),
  follow_up_note text,
  converted_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guest_passes_unique_event_guest
  ON public.guest_passes (event_id, lower(guest_email));
CREATE INDEX IF NOT EXISTS guest_passes_guest_email_idx
  ON public.guest_passes (lower(guest_email));
CREATE INDEX IF NOT EXISTS guest_passes_event_idx ON public.guest_passes (event_id);
CREATE INDEX IF NOT EXISTS guest_passes_status_idx ON public.guest_passes (status);

-- Grants: members insert their own request and read it back; the decision and
-- follow-up columns are the only ones any client may update, so the UPDATE
-- grant is column-scoped and the staff policy decides who may use it.
GRANT SELECT, INSERT ON public.guest_passes TO authenticated;
GRANT UPDATE (status, decision_by, decision_at, decision_note, registration_id,
              follow_up_status, follow_up_note, converted_member_id, updated_at)
  ON public.guest_passes TO authenticated;
GRANT ALL ON public.guest_passes TO service_role;

ALTER TABLE public.guest_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members create their own pending guest pass"
  ON public.guest_passes FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = guest_passes.inviting_member_id
         AND m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "members read their own guest passes"
  ON public.guest_passes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = guest_passes.inviting_member_id
         AND m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "membership staff read all guest passes"
  ON public.guest_passes FOR SELECT TO authenticated
  USING (private.is_membership_staff(auth.uid()));

CREATE POLICY "membership staff decide guest passes"
  ON public.guest_passes FOR UPDATE TO authenticated
  USING (private.is_membership_staff(auth.uid()))
  WITH CHECK (private.is_membership_staff(auth.uid()));

CREATE POLICY "event managers read guest passes for their events"
  ON public.guest_passes FOR SELECT TO authenticated
  USING (private.event_is_managed_by(guest_passes.event_id, auth.uid()));

-- 4. Guard -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_guest_pass_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  staff boolean := auth.uid() IS NOT NULL AND private.is_membership_staff(auth.uid());
BEGIN
  NEW.updated_at = now();

  IF TG_OP = 'INSERT' THEN
    NEW.guest_email = lower(btrim(NEW.guest_email));

    IF NOT trusted AND NOT staff THEN
      -- A member may only ever create the initial request.
      NEW.status = 'pending';
      NEW.decision_by = NULL;
      NEW.decision_at = NULL;
      NEW.decision_note = NULL;
      NEW.registration_id = NULL;
      NEW.follow_up_status = 'none';
      NEW.follow_up_note = NULL;
      NEW.converted_member_id = NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = NEW.inviting_member_id
         AND m.activity_state = 'active'
    ) THEN
      RAISE EXCEPTION 'guest pass: the inviting member is not an active member';
    END IF;

    SELECT * INTO ev FROM public.events WHERE id = NEW.event_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'guest pass: event not found';
    END IF;
    IF NOT ev.guest_passes_allowed THEN
      RAISE EXCEPTION 'guest pass: this event does not offer guest passes';
    END IF;
    IF ev.registration_mode = 'none' THEN
      RAISE EXCEPTION 'guest pass: this event does not take registrations';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.guest_passes g
       WHERE lower(g.guest_email) = NEW.guest_email
         AND g.status IN ('approved', 'registered', 'attended')
    ) THEN
      RAISE EXCEPTION 'guest pass: this guest has already used a guest pass';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.guest_passes g
       WHERE g.event_id = NEW.event_id
         AND lower(g.guest_email) = NEW.guest_email
    ) THEN
      RAISE EXCEPTION 'guest pass: this guest already has a request for this event';
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: only staff or the trusted server path may move the decision.
  IF NOT trusted AND NOT staff THEN
    NEW.status = OLD.status;
    NEW.decision_by = OLD.decision_by;
    NEW.decision_at = OLD.decision_at;
    NEW.decision_note = OLD.decision_note;
    NEW.registration_id = OLD.registration_id;
    NEW.follow_up_status = OLD.follow_up_status;
    NEW.follow_up_note = OLD.follow_up_note;
    NEW.converted_member_id = OLD.converted_member_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guest_pass_guard
  BEFORE INSERT OR UPDATE ON public.guest_passes
  FOR EACH ROW EXECUTE FUNCTION public.tg_guest_pass_guard();