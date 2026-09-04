-- Attendance session routines: accept a trusted actor so they can be called
-- from the verified server path instead of directly by signed-in browsers.
DROP FUNCTION IF EXISTS public.open_event_attendance_session(uuid, integer);
DROP FUNCTION IF EXISTS public.close_event_attendance_session(uuid);
DROP FUNCTION IF EXISTS public.get_event_attendance_session(uuid);

CREATE FUNCTION public.open_event_attendance_session(_event_id uuid, _grace_minutes integer DEFAULT 30, _actor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := coalesce(auth.uid(), _actor);
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

  IF FOUND THEN
    UPDATE public.event_attendance_sessions
       SET closed_at = now(), closed_by = uid
     WHERE id = s.id;
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

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

CREATE FUNCTION public.close_event_attendance_session(_event_id uuid, _actor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := coalesce(auth.uid(), _actor);
BEGIN
  IF uid IS NULL OR NOT private.event_is_managed_by(_event_id, uid) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;
  UPDATE public.event_attendance_sessions
     SET closed_at = now(), closed_by = uid
   WHERE event_id = _event_id AND closed_at IS NULL;
  RETURN jsonb_build_object('outcome', 'closed');
END;
$function$;

CREATE FUNCTION public.get_event_attendance_session(_event_id uuid, _actor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := coalesce(auth.uid(), _actor);
  s public.event_attendance_sessions%ROWTYPE;
BEGIN
  IF uid IS NULL OR NOT private.event_is_managed_by(_event_id, uid) THEN
    RAISE EXCEPTION 'not authorised for this event';
  END IF;
  SELECT * INTO s FROM public.event_attendance_sessions
    WHERE event_id = _event_id AND closed_at IS NULL AND now() <= ends_at
    ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', s.id, 'public_token', s.public_token,
    'ends_at', s.ends_at, 'grace_minutes', s.grace_minutes
  );
END;
$function$;

-- These privileged routines are only reachable through the verified server
-- path from now on; signed-in browser sessions cannot call them directly.
REVOKE ALL ON FUNCTION public.open_event_attendance_session(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_event_attendance_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_attendance_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_event_completion(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reissue_event_certificate(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_event_certificate(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.open_event_attendance_session(uuid, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_event_attendance_session(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_attendance_session(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_event_completion(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reissue_event_certificate(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_event_certificate(uuid, uuid, text) TO service_role;