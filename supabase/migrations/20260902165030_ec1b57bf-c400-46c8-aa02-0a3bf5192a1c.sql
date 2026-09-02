-- 1. Signed-in callers may not spoof the actor on certificate routines.
CREATE OR REPLACE FUNCTION public.issue_event_completion(_event_id uuid, _actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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
  -- A signed-in caller is always themselves; only the trusted server path may
  -- name a different actor.
  IF auth.uid() IS NOT NULL THEN
    _actor := auth.uid();
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.revoke_event_certificate(_certificate_id uuid, _actor uuid, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
DECLARE
  c public.event_certificates%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    _actor := auth.uid();
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.reissue_event_certificate(_certificate_id uuid, _actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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
  IF auth.uid() IS NOT NULL THEN
    _actor := auth.uid();
  END IF;

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
$function$;

-- 2. Guest-pass contact fields get shape and length limits, matching the other
--    public-facing insert paths.
ALTER TABLE public.guest_passes
  ADD CONSTRAINT guest_passes_guest_email_shape
    CHECK (guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' AND length(guest_email) <= 254) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_full_name_len
    CHECK (guest_full_name IS NULL OR (length(btrim(guest_full_name)) BETWEEN 1 AND 160)) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_phone_len
    CHECK (guest_phone IS NULL OR length(guest_phone) <= 40) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_location_len
    CHECK (guest_location IS NULL OR length(guest_location) <= 160) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_coaching_level_len
    CHECK (guest_coaching_level IS NULL OR length(guest_coaching_level) <= 80) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_professional_focus_len
    CHECK (guest_professional_focus IS NULL OR length(guest_professional_focus) <= 2000) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_other_associations_len
    CHECK (guest_other_associations IS NULL OR length(guest_other_associations) <= 500) NOT VALID,
  ADD CONSTRAINT guest_passes_guest_notes_len
    CHECK (guest_notes IS NULL OR length(guest_notes) <= 2000) NOT VALID;

ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_email_shape;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_full_name_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_phone_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_location_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_coaching_level_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_professional_focus_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_other_associations_len;
ALTER TABLE public.guest_passes VALIDATE CONSTRAINT guest_passes_guest_notes_len;