CREATE TYPE public.event_tier_segment AS ENUM ('member', 'non_member', 'general');
CREATE TYPE public.event_payment_status AS ENUM ('not_required', 'pending', 'paid', 'expired');

CREATE TABLE public.event_ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_de text,
  name_fr text,
  name_it text,
  description text,
  description_de text,
  description_fr text,
  description_it text,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0 AND price_cents <= 1000000),
  currency text NOT NULL DEFAULT 'CHF' CHECK (currency = 'CHF'),
  capacity integer CHECK (capacity > 0),
  segment public.event_tier_segment NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_ticket_tiers_event_idx ON public.event_ticket_tiers (event_id, sort_order);
CREATE UNIQUE INDEX event_ticket_tiers_one_member ON public.event_ticket_tiers (event_id)
  WHERE is_active AND segment = 'member';
CREATE UNIQUE INDEX event_ticket_tiers_one_non_member ON public.event_ticket_tiers (event_id)
  WHERE is_active AND segment = 'non_member';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_tiers TO authenticated;
GRANT ALL ON public.event_ticket_tiers TO service_role;
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read event tiers" ON public.event_ticket_tiers FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers write event tiers" ON public.event_ticket_tiers FOR INSERT TO authenticated
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers update event tiers" ON public.event_ticket_tiers FOR UPDATE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()))
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers delete event tiers" ON public.event_ticket_tiers FOR DELETE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE TRIGGER event_ticket_tiers_touch BEFORE UPDATE ON public.event_ticket_tiers
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.event_registration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  label_de text,
  label_fr text,
  label_it text,
  field_type text NOT NULL DEFAULT 'short_text'
    CHECK (field_type IN ('short_text', 'long_text', 'single_choice', 'checkbox')),
  options text[] NOT NULL DEFAULT '{}',
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, field_key)
);
CREATE INDEX event_registration_fields_event_idx ON public.event_registration_fields (event_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registration_fields TO authenticated;
GRANT ALL ON public.event_registration_fields TO service_role;
ALTER TABLE public.event_registration_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read event fields" ON public.event_registration_fields FOR SELECT TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers write event fields" ON public.event_registration_fields FOR INSERT TO authenticated
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers update event fields" ON public.event_registration_fields FOR UPDATE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()))
  WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));
CREATE POLICY "managers delete event fields" ON public.event_registration_fields FOR DELETE TO authenticated
  USING (private.event_is_managed_by(event_id, auth.uid()));
CREATE TRIGGER event_registration_fields_touch BEFORE UPDATE ON public.event_registration_fields
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

ALTER TABLE public.event_registrations
  ADD COLUMN tier_id uuid REFERENCES public.event_ticket_tiers(id) ON DELETE SET NULL,
  ADD COLUMN payment_status public.event_payment_status NOT NULL DEFAULT 'not_required',
  ADD COLUMN amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN currency text NOT NULL DEFAULT 'CHF',
  ADD COLUMN stripe_session_id text,
  ADD COLUMN hold_expires_at timestamptz,
  ADD COLUMN answers jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX event_registrations_stripe_session_idx
  ON public.event_registrations (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX event_registrations_tier_idx ON public.event_registrations (tier_id);

-- A pending seat only counts while its checkout hold is still alive.
CREATE OR REPLACE FUNCTION private.registration_holds_seat(
  _status public.event_registration_status,
  _payment_status public.event_payment_status,
  _hold_expires_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT _status = 'confirmed'
     AND (_payment_status <> 'pending' OR (_hold_expires_at IS NOT NULL AND _hold_expires_at > now()))
$$;

CREATE OR REPLACE FUNCTION private.event_confirmed_count(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.event_registrations r
  WHERE r.event_id = _event_id
    AND private.registration_holds_seat(r.status, r.payment_status, r.hold_expires_at)
$$;

CREATE OR REPLACE FUNCTION private.event_tier_taken_count(_tier_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.event_registrations r
  WHERE r.tier_id = _tier_id
    AND private.registration_holds_seat(r.status, r.payment_status, r.hold_expires_at)
$$;

CREATE VIEW public.event_ticket_tiers_public AS
  SELECT t.id,
         t.event_id,
         t.name, t.name_de, t.name_fr, t.name_it,
         t.description, t.description_de, t.description_fr, t.description_it,
         t.price_cents,
         t.currency,
         t.capacity,
         t.segment,
         t.sort_order,
         CASE WHEN t.capacity IS NULL THEN NULL
              ELSE GREATEST(t.capacity - private.event_tier_taken_count(t.id), 0) END AS seats_remaining,
         (t.capacity IS NOT NULL AND private.event_tier_taken_count(t.id) >= t.capacity) AS is_sold_out
  FROM public.event_ticket_tiers t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.is_active AND e.status = 'published';
GRANT SELECT ON public.event_ticket_tiers_public TO anon, authenticated;
GRANT ALL ON public.event_ticket_tiers_public TO service_role;

CREATE VIEW public.event_registration_fields_public AS
  SELECT f.id, f.event_id, f.field_key,
         f.label, f.label_de, f.label_fr, f.label_it,
         f.field_type, f.options, f.is_required, f.sort_order
  FROM public.event_registration_fields f
  JOIN public.events e ON e.id = f.event_id
  WHERE f.is_active AND e.status = 'published';
GRANT SELECT ON public.event_registration_fields_public TO anon, authenticated;
GRANT ALL ON public.event_registration_fields_public TO service_role;

-- Registration guard: existing event-level rules, plus tier validity, tier
-- capacity under a row lock, and server-authoritative pricing.
CREATE OR REPLACE FUNCTION public.tg_event_registration_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ev public.events%ROWTYPE;
  tier public.event_ticket_tiers%ROWTYPE;
  active_tiers integer;
  taken integer;
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
  IF NEW.user_id IS NULL AND NOT ev.guest_registration_allowed THEN
    RAISE EXCEPTION 'this event requires an account to register';
  END IF;

  SELECT count(*) INTO active_tiers
  FROM public.event_ticket_tiers t
  WHERE t.event_id = NEW.event_id AND t.is_active;

  IF NEW.tier_id IS NOT NULL THEN
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
    IF active_tiers > 0 THEN
      RAISE EXCEPTION 'a ticket tier must be selected for this event';
    END IF;
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

-- Clients may create free or pending registrations; never a paid one.
DROP POLICY "guests submit registrations" ON public.event_registrations;
CREATE POLICY "guests submit registrations" ON public.event_registrations FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND status = 'confirmed'
    AND payment_status IN ('not_required', 'pending')
  );
DROP POLICY "signed-in submit own registrations" ON public.event_registrations;
CREATE POLICY "signed-in submit own registrations" ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'confirmed'
    AND payment_status IN ('not_required', 'pending')
  );