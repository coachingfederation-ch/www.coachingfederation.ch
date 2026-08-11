-- Existing rsvp events with at least one active ticket tier become ticketed;
-- events that previously demanded an account become members-only.
UPDATE public.events e
   SET registration_mode = 'rsvp_tickets'
 WHERE e.registration_mode = 'rsvp'
   AND EXISTS (
     SELECT 1 FROM public.event_ticket_tiers t
      WHERE t.event_id = e.id AND t.is_active
   );

UPDATE public.events e
   SET registration_mode = 'rsvp_members'
 WHERE e.registration_mode = 'rsvp'
   AND e.guest_registration_allowed = false;

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
BEGIN
  NEW.email = lower(btrim(NEW.email));
  NEW.updated_at = now();

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

  -- Members-only events: an active membership is required unless the organizer
  -- allows registration without one. The site verifies member numbers itself and
  -- writes through the trusted server path; every other caller must be a
  -- signed-in account linked to an active member record.
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
    -- FOR UPDATE serialises concurrent buyers of the same tier.
    SELECT * INTO tier FROM public.event_ticket_tiers WHERE id = NEW.tier_id FOR UPDATE;
    IF NOT FOUND OR tier.event_id <> NEW.event_id OR NOT tier.is_active THEN
      RAISE EXCEPTION 'ticket tier is not available for this event';
    END IF;

    -- Price and currency always come from stored tier data.
    NEW.amount_cents = tier.price_cents;
    NEW.currency = tier.currency;
    IF tier.price_cents = 0 THEN
      NEW.payment_status = 'not_required';
      NEW.hold_expires_at = NULL;
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
    -- Tiers are only offered on ticketed events; anything else registers free.
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