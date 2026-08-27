CREATE OR REPLACE FUNCTION public.open_event_attendance_session(_event_id uuid, _grace_minutes integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  s public.event_attendance_sessions%ROWTYPE;
  ev public.events%ROWTYPE;
  grace int := least(greatest(coalesce(_grace_minutes, 30), 0), 180);
  token text;
BEGIN
  IF uid IS NULL OR NOT private.event_is_managed_by(_event_id, uid) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;

  SELECT * INTO s FROM public.event_attendance_sessions
    WHERE event_id = _event_id AND closed_at IS NULL
    ORDER BY started_at DESC LIMIT 1;

  IF FOUND AND now() <= s.ends_at THEN
    RETURN jsonb_build_object(
      'id', s.id, 'public_token', s.public_token,
      'ends_at', s.ends_at, 'grace_minutes', s.grace_minutes
    );
  END IF;

  -- An expired-but-open row is closed so the partial unique index stays free.
  IF FOUND THEN
    UPDATE public.event_attendance_sessions
       SET closed_at = now(), closed_by = uid
     WHERE id = s.id;
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  -- pgcrypto lives in the extensions schema, which is not on this function's
  -- search_path, so the call must be schema-qualified.
  token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');

  INSERT INTO public.event_attendance_sessions
    (event_id, public_token, ends_at, grace_minutes, started_by)
  VALUES (
    _event_id,
    token,
    greatest(coalesce(ev.ends_at, ev.starts_at), now()) + make_interval(mins => grace),
    grace,
    uid
  )
  RETURNING * INTO s;

  RETURN jsonb_build_object(
    'id', s.id, 'public_token', s.public_token,
    'ends_at', s.ends_at, 'grace_minutes', s.grace_minutes
  );
END;
$function$;