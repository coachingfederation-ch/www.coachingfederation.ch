CREATE OR REPLACE FUNCTION public.check_in_registration(_registration_id uuid, _actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- A comped guest-pass seat records the attendance on the pass as well, so
  -- Membership & Engagement can see who actually came. Only a pass that is
  -- still approved/registered moves; nothing else about check-in changes.
  UPDATE public.guest_passes
     SET status = 'attended'
   WHERE registration_id = r.id
     AND status IN ('approved', 'registered');

  RETURN jsonb_build_object('outcome', 'checked_in', 'checked_in_at', now());
END;
$function$;