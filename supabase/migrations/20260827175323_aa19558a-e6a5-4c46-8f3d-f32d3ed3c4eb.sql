-- 1. Source of an attendance + the window it belonged to -----------------
CREATE TYPE public.event_check_in_source AS ENUM ('door', 'self_qr', 'import', 'staff');

ALTER TABLE public.event_registrations
  ADD COLUMN checked_in_source public.event_check_in_source,
  ADD COLUMN checked_in_session_id uuid;

-- 2. Attendance windows ----------------------------------------------------
CREATE TABLE public.event_attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  public_token text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  grace_minutes int NOT NULL DEFAULT 30 CHECK (grace_minutes BETWEEN 0 AND 180),
  started_by uuid NOT NULL,
  closed_at timestamptz NULL,
  closed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_attendance_sessions TO authenticated;
GRANT ALL ON public.event_attendance_sessions TO service_role;

ALTER TABLE public.event_attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event managers can read attendance windows"
  ON public.event_attendance_sessions FOR SELECT
  TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));

CREATE UNIQUE INDEX event_attendance_sessions_one_open
  ON public.event_attendance_sessions (event_id)
  WHERE closed_at IS NULL;

CREATE INDEX event_attendance_sessions_event_idx
  ON public.event_attendance_sessions (event_id);

CREATE TRIGGER event_attendance_sessions_touch
  BEFORE UPDATE ON public.event_attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_checked_in_session_fkey
  FOREIGN KEY (checked_in_session_id)
  REFERENCES public.event_attendance_sessions(id) ON DELETE SET NULL;

-- 3. Shared eligibility rule (NULL = eligible, otherwise the reason) --------
CREATE OR REPLACE FUNCTION private.registration_is_check_in_eligible(r public.event_registrations)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN r.status <> 'confirmed' THEN 'cancelled'
    WHEN r.refund_status IN ('refunded', 'pending') THEN 'refunded'
    WHEN r.payment_status NOT IN ('not_required', 'paid') THEN r.payment_status::text
    ELSE NULL
  END
$$;

-- 4. Door check-in now records its source ----------------------------------
CREATE OR REPLACE FUNCTION public.check_in_registration(_registration_id uuid, _actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.event_registrations%ROWTYPE;
  uid uuid := _actor;
  ineligible text;
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

  ineligible := private.registration_is_check_in_eligible(r);
  IF ineligible IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ineligible', 'reason', ineligible);
  END IF;

  IF r.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'already',
      'checked_in_at', r.checked_in_at,
      'checked_in_by', r.checked_in_by
    );
  END IF;

  UPDATE public.event_registrations
     SET checked_in_at = now(),
         checked_in_by = uid,
         checked_in_source = 'door'
   WHERE id = r.id AND checked_in_at IS NULL;

  -- A comped guest-pass seat records the attendance on the pass as well, so
  -- Membership & Engagement can see who actually came.
  UPDATE public.guest_passes
     SET status = 'attended'
   WHERE registration_id = r.id
     AND status IN ('approved', 'registered');

  RETURN jsonb_build_object('outcome', 'checked_in', 'checked_in_at', now());
END;
$function$;

-- 5. Attendee self-confirmation: window code + own ticket code --------------
CREATE OR REPLACE FUNCTION public.self_check_in_with_ticket(_session_token text, _ticket_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.event_attendance_sessions%ROWTYPE;
  r public.event_registrations%ROWTYPE;
  ineligible text;
BEGIN
  -- Both halves must look like a token before anything is read, and a bad
  -- session and a bad ticket answer identically so the pair is not an oracle.
  IF _session_token !~ '^[A-Za-z0-9_-]{16,64}$'
     OR _ticket_token !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  SELECT * INTO s FROM public.event_attendance_sessions
    WHERE public_token = _session_token FOR SHARE;
  IF NOT FOUND OR s.closed_at IS NOT NULL OR now() > s.ends_at THEN
    RETURN jsonb_build_object('outcome', 'window_closed');
  END IF;

  SELECT * INTO r FROM public.event_registrations
    WHERE check_in_token = _ticket_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF r.event_id <> s.event_id THEN
    RETURN jsonb_build_object('outcome', 'wrong_event');
  END IF;

  ineligible := private.registration_is_check_in_eligible(r);
  IF ineligible IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ineligible', 'reason', ineligible, 'name', r.full_name);
  END IF;

  IF r.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'already',
      'checked_in_at', r.checked_in_at,
      'name', r.full_name
    );
  END IF;

  UPDATE public.event_registrations
     SET checked_in_at = now(),
         checked_in_by = NULL,
         checked_in_source = 'self_qr',
         checked_in_session_id = s.id
   WHERE id = r.id AND checked_in_at IS NULL;

  UPDATE public.guest_passes
     SET status = 'attended'
   WHERE registration_id = r.id
     AND status IN ('approved', 'registered');

  RETURN jsonb_build_object('outcome', 'checked_in', 'name', r.full_name);
END;
$function$;

REVOKE ALL ON FUNCTION public.self_check_in_with_ticket(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.self_check_in_with_ticket(text, text) TO anon, authenticated, service_role;

-- Public status read for the confirm page: never exposes attendee data.
CREATE OR REPLACE FUNCTION public.attendance_session_status(_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.event_attendance_sessions%ROWTYPE;
  e public.events%ROWTYPE;
BEGIN
  IF _session_token !~ '^[A-Za-z0-9_-]{16,64}$' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO s FROM public.event_attendance_sessions WHERE public_token = _session_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO e FROM public.events WHERE id = s.event_id;
  RETURN jsonb_build_object(
    'open', s.closed_at IS NULL AND now() <= s.ends_at,
    'ends_at', s.ends_at,
    'event_title', coalesce(e.title, ''),
    'event_slug', e.slug
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.attendance_session_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_session_status(text) TO anon, authenticated, service_role;

-- 6. Staff window routines --------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_event_attendance_session(_event_id uuid, _grace_minutes int DEFAULT 30)
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

  token := translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');

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

CREATE OR REPLACE FUNCTION public.close_event_attendance_session(_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
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

CREATE OR REPLACE FUNCTION public.get_event_attendance_session(_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
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

REVOKE ALL ON FUNCTION public.open_event_attendance_session(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_event_attendance_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_event_attendance_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_event_attendance_session(uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_event_attendance_session(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_attendance_session(uuid) TO authenticated, service_role;

-- 7. The new attendance columns are server-owned ----------------------------
CREATE OR REPLACE FUNCTION public.tg_event_registration_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev public.events%ROWTYPE;
  tier public.event_ticket_tiers%ROWTYPE;
  dc public.event_discount_codes%ROWTYPE;
  discount integer := 0;
  used integer;
  taken integer;
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  manager boolean := false;
BEGIN
  NEW.email = lower(btrim(NEW.email));
  NEW.updated_at = now();

  IF auth.uid() IS NOT NULL THEN
    manager := private.event_is_managed_by(NEW.event_id, auth.uid());
  END IF;

  IF TG_OP = 'UPDATE' AND NOT trusted AND NOT manager THEN
    NEW.event_id = OLD.event_id;
    NEW.user_id = OLD.user_id;
    NEW.tier_id = OLD.tier_id;
    NEW.payment_status = OLD.payment_status;
    NEW.amount_cents = OLD.amount_cents;
    NEW.currency = OLD.currency;
    NEW.stripe_session_id = OLD.stripe_session_id;
    NEW.hold_expires_at = OLD.hold_expires_at;
    NEW.discount_code_id = OLD.discount_code_id;
    NEW.checked_in_at = OLD.checked_in_at;
    NEW.checked_in_by = OLD.checked_in_by;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT trusted THEN
    NEW.payment_environment = OLD.payment_environment;
    NEW.refund_status = OLD.refund_status;
    NEW.refund_amount_cents = OLD.refund_amount_cents;
    NEW.stripe_refund_id = OLD.stripe_refund_id;
    NEW.refunded_at = OLD.refunded_at;
    NEW.refund_error = OLD.refund_error;
    NEW.cancellation_status = OLD.cancellation_status;
    NEW.cancellation_sent_at = OLD.cancellation_sent_at;
    NEW.cancellation_error = OLD.cancellation_error;
    NEW.discount_code_text = OLD.discount_code_text;
    NEW.discount_type = OLD.discount_type;
    NEW.discount_value = OLD.discount_value;
    NEW.discount_amount_cents = OLD.discount_amount_cents;
    NEW.check_in_token = OLD.check_in_token;
    NEW.created_by_staff = OLD.created_by_staff;
    NEW.reminder_7d_sent_at = OLD.reminder_7d_sent_at;
    NEW.reminder_1d_sent_at = OLD.reminder_1d_sent_at;
    -- How an attendance was recorded is decided by the check-in routines only.
    NEW.checked_in_source = OLD.checked_in_source;
    NEW.checked_in_session_id = OLD.checked_in_session_id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.payment_status = 'paid'
     AND OLD.payment_status IS DISTINCT FROM 'paid'
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'payment status can only be set by the payment confirmation path';
  END IF;

  IF TG_OP = 'INSERT' AND NOT trusted THEN
    NEW.checked_in_at = NULL;
    NEW.checked_in_by = NULL;
    NEW.checked_in_source = NULL;
    NEW.checked_in_session_id = NULL;
    NEW.created_by_staff = NULL;
    NEW.reminder_7d_sent_at = NULL;
    NEW.reminder_1d_sent_at = NULL;
    NEW.amount_cents = 0;
    NEW.currency = 'CHF';
    NEW.discount_code_text = NULL;
    NEW.discount_type = NULL;
    NEW.discount_value = NULL;
    NEW.discount_amount_cents = 0;
    NEW.stripe_session_id = NULL;
    NEW.payment_environment = NULL;
    NEW.refund_status = 'none';
    NEW.refund_amount_cents = 0;
    NEW.stripe_refund_id = NULL;
    NEW.refunded_at = NULL;
    NEW.refund_error = NULL;
    IF NEW.payment_status = 'paid' AND NOT manager THEN
      RAISE EXCEPTION 'payment status can only be set by the payment confirmation path';
    END IF;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF ev.status <> 'published' THEN
    RAISE EXCEPTION 'event is not open for registration';
  END IF;
  IF ev.registration_mode = 'none' THEN
    RAISE EXCEPTION 'this event does not take registrations';
  END IF;
  IF ev.registration_opens_at IS NOT NULL AND now() < ev.registration_opens_at THEN
    RAISE EXCEPTION 'registration has not opened yet';
  END IF;
  IF ev.registration_closes_at IS NOT NULL AND now() > ev.registration_closes_at THEN
    RAISE EXCEPTION 'registration has closed';
  END IF;

  IF ev.registration_mode = 'rsvp_members'
     AND NOT ev.guest_registration_allowed
     AND NOT trusted THEN
    IF NEW.user_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.members m
          WHERE m.auth_user_id = NEW.user_id
            AND m.activity_state = 'active'
       ) THEN
      RAISE EXCEPTION 'this event is open to active members only';
    END IF;
  END IF;

  IF ev.registration_mode = 'rsvp_tickets' THEN
    IF NEW.tier_id IS NULL THEN
      RAISE EXCEPTION 'a ticket tier must be selected for this event';
    END IF;
    SELECT * INTO tier FROM public.event_ticket_tiers WHERE id = NEW.tier_id FOR UPDATE;
    IF NOT FOUND OR tier.event_id <> NEW.event_id OR NOT tier.is_active THEN
      RAISE EXCEPTION 'ticket tier is not available for this event';
    END IF;

    NEW.amount_cents = tier.price_cents;
    NEW.currency = tier.currency;

    IF NEW.discount_code_id IS NOT NULL THEN
      SELECT * INTO dc FROM public.event_discount_codes
        WHERE id = NEW.discount_code_id FOR UPDATE;
      IF NOT FOUND
         OR dc.event_id <> NEW.event_id
         OR dc.is_archived
         OR NOT dc.is_active
         OR (dc.starts_at IS NOT NULL AND now() < dc.starts_at)
         OR (dc.expires_at IS NOT NULL AND now() > dc.expires_at)
         OR (coalesce(array_length(dc.tier_ids, 1), 0) > 0 AND NOT (NEW.tier_id = ANY (dc.tier_ids)))
      THEN
        RAISE EXCEPTION 'discount code is not valid for this registration';
      END IF;

      IF dc.member_only AND NOT trusted THEN
        IF NEW.user_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM public.members m
              WHERE m.auth_user_id = NEW.user_id
                AND m.activity_state = 'active'
           ) THEN
          RAISE EXCEPTION 'discount code is available to active members only';
        END IF;
      END IF;

      IF dc.max_uses IS NOT NULL THEN
        SELECT count(*) INTO used
        FROM public.event_registrations r
        WHERE r.discount_code_id = dc.id
          AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
          AND r.status = 'confirmed'
          AND (
            r.payment_status IN ('not_required', 'paid')
            OR (r.payment_status = 'pending'
                AND (r.hold_expires_at IS NULL OR r.hold_expires_at > now()))
          );
        IF used >= dc.max_uses THEN
          RAISE EXCEPTION 'discount code has been fully used';
        END IF;
      END IF;

      IF dc.discount_type = 'percentage' THEN
        discount := floor(tier.price_cents * least(dc.discount_value, 100) / 100.0);
      ELSE
        discount := least(dc.discount_value, tier.price_cents);
      END IF;
      discount := greatest(discount, 0);

      NEW.discount_code_text = dc.code;
      NEW.discount_type = dc.discount_type;
      NEW.discount_value = dc.discount_value;
      NEW.discount_amount_cents = discount;
      NEW.amount_cents = greatest(tier.price_cents - discount, 0);
    END IF;

    IF tier.capacity IS NOT NULL THEN
      SELECT count(*) INTO taken
      FROM public.event_registrations r
      WHERE r.tier_id = tier.id
        AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
        AND r.status = 'confirmed'
        AND (
          r.payment_status IN ('not_required', 'paid')
          OR (r.payment_status = 'pending'
              AND (r.hold_expires_at IS NULL OR r.hold_expires_at > now()))
        );
      IF taken >= tier.capacity THEN
        RAISE EXCEPTION 'ticket tier is full';
      END IF;
    END IF;
  END IF;

  IF ev.capacity IS NOT NULL THEN
    SELECT count(*) INTO taken
    FROM public.event_registrations r
    WHERE r.event_id = NEW.event_id
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id)
      AND r.status = 'confirmed'
      AND (
        r.payment_status IN ('not_required', 'paid')
        OR (r.payment_status = 'pending'
            AND (r.hold_expires_at IS NULL OR r.hold_expires_at > now()))
      );
    IF taken >= ev.capacity THEN
      RAISE EXCEPTION 'event is full';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;