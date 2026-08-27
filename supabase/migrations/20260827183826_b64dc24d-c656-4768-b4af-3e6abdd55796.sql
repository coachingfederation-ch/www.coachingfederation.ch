-- 1. Event flag
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS certificates_enabled boolean NOT NULL DEFAULT false;

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.event_certificate_status AS ENUM ('issued', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_cce_award_status AS ENUM ('awarded', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Certificates
CREATE TABLE public.event_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  member_id uuid NULL REFERENCES public.members(id) ON DELETE SET NULL,
  serial text NOT NULL UNIQUE,
  public_token text NOT NULL UNIQUE,
  status public.event_certificate_status NOT NULL DEFAULT 'issued',
  locale text NOT NULL,
  holder_name text NOT NULL,
  event_title_snapshot text NOT NULL,
  completed_on date NOT NULL,
  cc_hours numeric(5,2) NULL,
  rd_hours numeric(5,2) NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL,
  revoked_at timestamptz NULL,
  revoked_by uuid NULL,
  revoke_reason text NULL,
  superseded_by uuid NULL REFERENCES public.event_certificates(id),
  email_status text NOT NULL DEFAULT 'not_sent',
  email_error text NULL
);

GRANT SELECT ON public.event_certificates TO authenticated;
GRANT ALL ON public.event_certificates TO service_role;

ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX event_certificates_one_live
  ON public.event_certificates (registration_id)
  WHERE status = 'issued';

CREATE INDEX event_certificates_event_idx ON public.event_certificates (event_id);
CREATE INDEX event_certificates_member_idx ON public.event_certificates (member_id);

CREATE POLICY "Event managers read certificates"
  ON public.event_certificates FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "Holders read their own certificates"
  ON public.event_certificates FOR SELECT TO authenticated
  USING (
    member_id IS NOT NULL
    AND member_id IN (SELECT m.id FROM public.members m WHERE m.auth_user_id = auth.uid())
  );

-- 4. CCE awards ledger
CREATE TABLE public.event_cce_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL UNIQUE REFERENCES public.event_registrations(id) ON DELETE RESTRICT,
  member_id uuid NULL REFERENCES public.members(id) ON DELETE SET NULL,
  certificate_id uuid NULL REFERENCES public.event_certificates(id) ON DELETE SET NULL,
  cc_hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (cc_hours >= 0),
  rd_hours numeric(5,2) NOT NULL DEFAULT 0 CHECK (rd_hours >= 0),
  status public.event_cce_award_status NOT NULL DEFAULT 'awarded',
  awarded_at timestamptz NOT NULL DEFAULT now(),
  awarded_by uuid NOT NULL,
  revoked_at timestamptz NULL,
  revoked_by uuid NULL,
  CONSTRAINT event_cce_awards_hours_positive
    CHECK (status <> 'awarded' OR (cc_hours + rd_hours) > 0)
);

GRANT SELECT ON public.event_cce_awards TO authenticated;
GRANT ALL ON public.event_cce_awards TO service_role;

ALTER TABLE public.event_cce_awards ENABLE ROW LEVEL SECURITY;

CREATE INDEX event_cce_awards_event_idx ON public.event_cce_awards (event_id);
CREATE INDEX event_cce_awards_member_idx ON public.event_cce_awards (member_id);

CREATE POLICY "Staff read awards"
  ON public.event_cce_awards FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()) OR private.is_staff(auth.uid()));

CREATE POLICY "Holders read their own awards"
  ON public.event_cce_awards FOR SELECT TO authenticated
  USING (
    member_id IS NOT NULL
    AND member_id IN (SELECT m.id FROM public.members m WHERE m.auth_user_id = auth.uid())
  );

-- 5. Serial allocator
CREATE TABLE IF NOT EXISTS private.certificate_serials (
  year int PRIMARY KEY,
  last_n int NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION private.next_certificate_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  y int := extract(year from now())::int;
  n int;
BEGIN
  INSERT INTO private.certificate_serials (year, last_n)
  VALUES (y, 0)
  ON CONFLICT (year) DO NOTHING;

  SELECT last_n INTO n FROM private.certificate_serials WHERE year = y FOR UPDATE;
  n := n + 1;
  UPDATE private.certificate_serials SET last_n = n WHERE year = y;

  RETURN 'ICFS-' || y::text || '-' || lpad(n::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION private.new_certificate_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_')
$$;

-- Grantable CCE hours for an event, or NULL when the event grants nothing.
CREATE OR REPLACE FUNCTION private.event_grantable_hours(_event_id uuid)
RETURNS TABLE (cc numeric, rd numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'private'
AS $$
  SELECT
    CASE WHEN a.status = 'approved' THEN coalesce(a.approved_cc_hours, 0) ELSE 0 END::numeric,
    CASE
      WHEN a.status = 'approved' THEN coalesce(a.approved_rd_hours, 0)
      ELSE coalesce(a.approved_rd_hours, a.resource_development_hours, 0)
    END::numeric
  FROM public.event_cce_applications a
  WHERE a.event_id = _event_id
    AND a.status IN ('approved', 'not_required_rd_only')
  LIMIT 1
$$;

-- 6. Issue batch
CREATE OR REPLACE FUNCTION public.issue_event_completion(_event_id uuid, _actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  ev public.events%ROWTYPE;
  reg public.event_registrations%ROWTYPE;
  cc numeric;
  rd numeric;
  grantable boolean := false;
  cert_id uuid;
  mid uuid;
  issued int := 0;
  awards int := 0;
  skipped_already int := 0;
  skipped_ineligible int := 0;
BEGIN
  IF _actor IS NULL OR NOT private.event_is_managed_by(_event_id, _actor) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;
  IF NOT ev.certificates_enabled THEN
    RAISE EXCEPTION 'certificates are not enabled for this event';
  END IF;

  SELECT g.cc, g.rd INTO cc, rd FROM private.event_grantable_hours(_event_id) g;
  grantable := cc IS NOT NULL;

  FOR reg IN
    SELECT * FROM public.event_registrations
     WHERE event_id = _event_id
       AND status = 'confirmed'
       AND checked_in_at IS NOT NULL
     ORDER BY checked_in_at
  LOOP
    IF private.registration_is_check_in_eligible(reg) IS NOT NULL THEN
      skipped_ineligible := skipped_ineligible + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.event_certificates c
       WHERE c.registration_id = reg.id AND c.status = 'issued'
    ) THEN
      skipped_already := skipped_already + 1;
      CONTINUE;
    END IF;

    -- The holder is linked to a member record only through the account
    -- linkage on the registration. Never by email.
    mid := NULL;
    IF reg.user_id IS NOT NULL THEN
      SELECT m.id INTO mid FROM public.members m WHERE m.auth_user_id = reg.user_id LIMIT 1;
    END IF;

    INSERT INTO public.event_certificates (
      registration_id, event_id, member_id, serial, public_token, locale,
      holder_name, event_title_snapshot, completed_on, cc_hours, rd_hours, issued_by
    ) VALUES (
      reg.id, _event_id, mid,
      private.next_certificate_serial(),
      private.new_certificate_token(),
      coalesce(reg.locale, 'en'),
      reg.full_name,
      ev.title,
      (ev.starts_at AT TIME ZONE coalesce(ev.timezone, 'Europe/Zurich'))::date,
      CASE WHEN grantable THEN cc ELSE NULL END,
      CASE WHEN grantable THEN rd ELSE NULL END,
      _actor
    )
    RETURNING id INTO cert_id;

    issued := issued + 1;

    IF grantable AND (coalesce(cc, 0) + coalesce(rd, 0)) > 0 THEN
      INSERT INTO public.event_cce_awards (
        event_id, registration_id, member_id, certificate_id,
        cc_hours, rd_hours, status, awarded_by
      ) VALUES (
        _event_id, reg.id, mid, cert_id, coalesce(cc, 0), coalesce(rd, 0), 'awarded', _actor
      )
      ON CONFLICT (registration_id) DO UPDATE SET
        status = 'awarded',
        cc_hours = EXCLUDED.cc_hours,
        rd_hours = EXCLUDED.rd_hours,
        certificate_id = EXCLUDED.certificate_id,
        member_id = EXCLUDED.member_id,
        awarded_at = now(),
        awarded_by = EXCLUDED.awarded_by,
        revoked_at = NULL,
        revoked_by = NULL;
      awards := awards + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'certificates_issued', issued,
    'awards_written', awards,
    'skipped_already', skipped_already,
    'skipped_ineligible', skipped_ineligible
  );
END;
$$;

-- 7. Revoke / reissue
CREATE OR REPLACE FUNCTION public.revoke_event_certificate(
  _certificate_id uuid, _actor uuid, _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  c public.event_certificates%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.event_certificates WHERE id = _certificate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF _actor IS NULL OR NOT private.event_is_managed_by(c.event_id, _actor) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;
  IF c.status = 'revoked' THEN
    RETURN jsonb_build_object('outcome', 'already_revoked');
  END IF;

  UPDATE public.event_certificates
     SET status = 'revoked', revoked_at = now(), revoked_by = _actor,
         revoke_reason = _reason
   WHERE id = c.id;

  UPDATE public.event_cce_awards
     SET status = 'revoked', revoked_at = now(), revoked_by = _actor
   WHERE certificate_id = c.id AND status = 'awarded';

  RETURN jsonb_build_object('outcome', 'revoked', 'registration_id', c.registration_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reissue_event_certificate(_certificate_id uuid, _actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
DECLARE
  c public.event_certificates%ROWTYPE;
  reg public.event_registrations%ROWTYPE;
  ev public.events%ROWTYPE;
  cc numeric;
  rd numeric;
  grantable boolean := false;
  new_id uuid;
  new_token text;
  mid uuid;
BEGIN
  SELECT * INTO c FROM public.event_certificates WHERE id = _certificate_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  IF _actor IS NULL OR NOT private.event_is_managed_by(c.event_id, _actor) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;

  SELECT * INTO reg FROM public.event_registrations WHERE id = c.registration_id FOR UPDATE;
  IF NOT FOUND OR reg.checked_in_at IS NULL
     OR private.registration_is_check_in_eligible(reg) IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = c.event_id;
  SELECT g.cc, g.rd INTO cc, rd FROM private.event_grantable_hours(c.event_id) g;
  grantable := cc IS NOT NULL;

  UPDATE public.event_certificates
     SET status = 'revoked', revoked_at = now(), revoked_by = _actor,
         revoke_reason = coalesce(revoke_reason, 'reissued')
   WHERE id = c.id AND status = 'issued';

  mid := NULL;
  IF reg.user_id IS NOT NULL THEN
    SELECT m.id INTO mid FROM public.members m WHERE m.auth_user_id = reg.user_id LIMIT 1;
  END IF;

  new_token := private.new_certificate_token();

  INSERT INTO public.event_certificates (
    registration_id, event_id, member_id, serial, public_token, locale,
    holder_name, event_title_snapshot, completed_on, cc_hours, rd_hours, issued_by
  ) VALUES (
    reg.id, c.event_id, mid,
    private.next_certificate_serial(),
    new_token,
    coalesce(reg.locale, c.locale),
    reg.full_name,
    ev.title,
    (ev.starts_at AT TIME ZONE coalesce(ev.timezone, 'Europe/Zurich'))::date,
    CASE WHEN grantable THEN cc ELSE NULL END,
    CASE WHEN grantable THEN rd ELSE NULL END,
    _actor
  )
  RETURNING id INTO new_id;

  UPDATE public.event_certificates SET superseded_by = new_id WHERE id = c.id;

  IF grantable AND (coalesce(cc, 0) + coalesce(rd, 0)) > 0 THEN
    INSERT INTO public.event_cce_awards (
      event_id, registration_id, member_id, certificate_id,
      cc_hours, rd_hours, status, awarded_by
    ) VALUES (
      c.event_id, reg.id, mid, new_id, coalesce(cc, 0), coalesce(rd, 0), 'awarded', _actor
    )
    ON CONFLICT (registration_id) DO UPDATE SET
      status = 'awarded',
      cc_hours = EXCLUDED.cc_hours,
      rd_hours = EXCLUDED.rd_hours,
      certificate_id = EXCLUDED.certificate_id,
      member_id = EXCLUDED.member_id,
      awarded_at = now(),
      awarded_by = EXCLUDED.awarded_by,
      revoked_at = NULL,
      revoked_by = NULL;
  END IF;

  RETURN jsonb_build_object('outcome', 'reissued', 'certificate_id', new_id, 'token', new_token);
END;
$$;

-- 8. Undoing an attendance withdraws the paperwork
CREATE OR REPLACE FUNCTION public.tg_registration_attendance_undone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.checked_in_at IS NOT NULL AND NEW.checked_in_at IS NULL THEN
    UPDATE public.event_certificates
       SET status = 'revoked', revoked_at = now(), revoke_reason = 'attendance_undone'
     WHERE registration_id = NEW.id AND status = 'issued';

    UPDATE public.event_cce_awards
       SET status = 'revoked', revoked_at = now()
     WHERE registration_id = NEW.id AND status = 'awarded';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER registration_attendance_undone
  AFTER UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.tg_registration_attendance_undone();

-- 9. Public verify lookup (token is the only credential; no table SELECT for anon)
CREATE OR REPLACE FUNCTION public.get_certificate_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.event_certificates%ROWTYPE;
BEGIN
  IF _token !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO c FROM public.event_certificates WHERE public_token = _token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF c.status = 'revoked' THEN
    RETURN jsonb_build_object('status', 'revoked', 'serial', c.serial, 'locale', c.locale);
  END IF;

  RETURN jsonb_build_object(
    'status', 'issued',
    'serial', c.serial,
    'locale', c.locale,
    'holder_name', c.holder_name,
    'event_title', c.event_title_snapshot,
    'completed_on', c.completed_on,
    'cc_hours', c.cc_hours,
    'rd_hours', c.rd_hours,
    'issued_at', c.issued_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_event_completion(uuid, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_event_certificate(uuid, uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.reissue_event_certificate(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_event_completion(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_event_certificate(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reissue_event_certificate(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_certificate_by_token(text) TO anon, authenticated, service_role;