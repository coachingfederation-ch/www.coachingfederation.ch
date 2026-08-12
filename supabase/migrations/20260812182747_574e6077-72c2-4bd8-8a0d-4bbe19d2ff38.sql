-- 1. Restrict attendee self-update to a pure cancellation
DROP POLICY IF EXISTS "cancel own registrations" ON public.event_registrations;
CREATE POLICY "cancel own registrations"
  ON public.event_registrations
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'confirmed'::event_registration_status
    AND payment_status <> 'paid'::event_payment_status
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelled'::event_registration_status
    AND payment_status <> 'paid'::event_payment_status
    AND checked_in_at IS NULL
  );

-- 2. Check-in routines become server-only, with an explicit verified actor
DROP FUNCTION IF EXISTS public.check_in_registration(uuid);
DROP FUNCTION IF EXISTS public.undo_check_in(uuid);

CREATE FUNCTION public.check_in_registration(_registration_id uuid, _actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.event_registrations%ROWTYPE;
  uid uuid := _actor;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO r FROM public.event_registrations
    WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF NOT private.event_is_managed_by(r.event_id, uid) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;

  IF r.status <> 'confirmed' THEN
    RETURN jsonb_build_object('outcome', 'ineligible', 'reason', 'cancelled');
  END IF;
  IF r.refund_status IN ('refunded', 'pending') THEN
    RETURN jsonb_build_object('outcome', 'ineligible', 'reason', 'refunded');
  END IF;
  IF r.payment_status NOT IN ('not_required', 'paid') THEN
    RETURN jsonb_build_object('outcome', 'ineligible', 'reason', r.payment_status::text);
  END IF;

  IF r.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'already',
      'checked_in_at', r.checked_in_at,
      'checked_in_by', r.checked_in_by
    );
  END IF;

  UPDATE public.event_registrations
     SET checked_in_at = now(), checked_in_by = uid
   WHERE id = r.id AND checked_in_at IS NULL;

  RETURN jsonb_build_object('outcome', 'checked_in', 'checked_in_at', now());
END;
$$;

CREATE FUNCTION public.undo_check_in(_registration_id uuid, _actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := _actor;
  ev uuid;
BEGIN
  IF uid IS NULL OR NOT (private.has_role(uid, 'admin') OR private.has_role(uid, 'editor')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  SELECT event_id INTO ev FROM public.event_registrations WHERE id = _registration_id;
  IF ev IS NULL THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;
  UPDATE public.event_registrations
     SET checked_in_at = NULL, checked_in_by = NULL
   WHERE id = _registration_id;
  RETURN jsonb_build_object('outcome', 'undone');
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_registration(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.undo_check_in(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_registration(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.undo_check_in(uuid, uuid) TO service_role;