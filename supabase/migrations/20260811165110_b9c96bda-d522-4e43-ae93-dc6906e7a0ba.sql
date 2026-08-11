ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS payment_environment text,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_error text,
  ADD COLUMN IF NOT EXISTS cancellation_status text NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS cancellation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_error text;

GRANT SELECT (refund_status, refund_amount_cents, refunded_at, refund_error,
              cancellation_status, cancellation_sent_at, cancellation_error)
  ON public.event_registrations TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_event_registration_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev public.events%ROWTYPE;
  tier public.event_ticket_tiers%ROWTYPE;
  taken integer;
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  manager boolean := false;
BEGIN
  NEW.email = lower(btrim(NEW.email));
  NEW.updated_at = now();

  IF auth.uid() IS NOT NULL THEN
    manager := private.event_is_managed_by(NEW.event_id, auth.uid());
  END IF;

  -- Payment- and refund-bearing columns are server-owned. An attendee updating
  -- their own row may cancel it and correct their contact details, nothing else.
  IF TG_OP = 'UPDATE' AND NOT trusted AND NOT manager THEN
    NEW.event_id = OLD.event_id;
    NEW.user_id = OLD.user_id;
    NEW.tier_id = OLD.tier_id;
    NEW.payment_status = OLD.payment_status;
    NEW.amount_cents = OLD.amount_cents;
    NEW.currency = OLD.currency;
    NEW.stripe_session_id = OLD.stripe_session_id;
    NEW.hold_expires_at = OLD.hold_expires_at;
  END IF;

  -- Refund and cancellation-email state is only ever written by the trusted
  -- server path, never by an attendee and never by a manager's own client.
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
  END IF;

  -- Only the payment confirmation path (service_role, no auth.uid()) may mark
  -- a registration paid.
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status = 'paid'
     AND OLD.payment_status IS DISTINCT FROM 'paid'
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'payment status can only be set by the payment confirmation path';
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
  IF ev.registration_closes_at IS NULL AND now() > coalesce(ev.ends_at, ev.starts_at) THEN
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
    IF tier.price_cents = 0 THEN
      NEW.payment_status = 'not_required';
      NEW.hold_expires_at = NULL;
    ELSIF NOT trusted AND NOT manager AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
      NEW.payment_status = 'pending';
      NEW.hold_expires_at = least(
        coalesce(NEW.hold_expires_at, now() + interval '30 minutes'),
        now() + interval '30 minutes'
      );
    END IF;

    IF tier.capacity IS NOT NULL THEN
      SELECT count(*) INTO taken
      FROM public.event_registrations r
      WHERE r.tier_id = NEW.tier_id
        AND private.registration_holds_seat(r.status, r.payment_status, r.hold_expires_at)
        AND (TG_OP = 'INSERT' OR r.id <> NEW.id);
      IF taken >= tier.capacity THEN
        RAISE EXCEPTION 'this ticket tier is full';
      END IF;
    END IF;
  ELSE
    NEW.tier_id = NULL;
    NEW.amount_cents = 0;
    NEW.payment_status = 'not_required';
    NEW.hold_expires_at = NULL;
  END IF;

  IF ev.capacity IS NOT NULL THEN
    SELECT count(*) INTO taken
    FROM public.event_registrations r
    WHERE r.event_id = NEW.event_id
      AND private.registration_holds_seat(r.status, r.payment_status, r.hold_expires_at)
      AND (TG_OP = 'INSERT' OR r.id <> NEW.id);
    IF taken >= ev.capacity THEN
      RAISE EXCEPTION 'event is full';
    END IF;
  END IF;

  RETURN NEW;
END; $function$;