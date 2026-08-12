-- ---------------------------------------------------------------------------
-- Cancellation notes + guest cancellation token
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS cancel_token_hash text;

-- Staff read the note in the attendee list; the token hash stays server-only.
GRANT SELECT (cancellation_note) ON public.event_registrations TO authenticated;

CREATE INDEX IF NOT EXISTS event_registrations_cancel_token_idx
  ON public.event_registrations (cancel_token_hash)
  WHERE cancel_token_hash IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Waitlist entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.event_ticket_tiers(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'waiting',
  note text,
  invite_token_hash text,
  invited_at timestamptz,
  invite_expires_at timestamptz,
  converted_registration_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_waitlist_status_check
    CHECK (status IN ('waiting','invited','converted','expired','withdrawn')),
  CONSTRAINT event_waitlist_locale_check CHECK (locale IN ('en','de','fr','it')),
  CONSTRAINT event_waitlist_email_shape
    CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$'),
  CONSTRAINT event_waitlist_name_shape CHECK (length(btrim(full_name)) BETWEEN 2 AND 200)
);

CREATE INDEX IF NOT EXISTS event_waitlist_event_idx
  ON public.event_waitlist_entries (event_id, created_at);
CREATE INDEX IF NOT EXISTS event_waitlist_tier_idx
  ON public.event_waitlist_entries (tier_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_waitlist_open_unique
  ON public.event_waitlist_entries (event_id, lower(email))
  WHERE status IN ('waiting','invited');
CREATE UNIQUE INDEX IF NOT EXISTS event_waitlist_invite_token_unique
  ON public.event_waitlist_entries (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

GRANT INSERT (event_id, tier_id, user_id, full_name, email, locale) 
  ON public.event_waitlist_entries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.event_waitlist_entries TO authenticated;
GRANT ALL ON public.event_waitlist_entries TO service_role;

ALTER TABLE public.event_waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER event_waitlist_entries_touch
  BEFORE UPDATE ON public.event_waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Is this event (or one of its tiers) actually full, so a waitlist makes sense?
CREATE OR REPLACE FUNCTION private.event_waitlist_open(_event_id uuid, _tier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  ev public.events%ROWTYPE;
  tier public.event_ticket_tiers%ROWTYPE;
BEGIN
  SELECT * INTO ev FROM public.events WHERE id = _event_id;
  IF NOT FOUND OR ev.status <> 'published' OR ev.registration_mode = 'none' THEN
    RETURN false;
  END IF;
  IF ev.registration_closes_at IS NOT NULL AND now() > ev.registration_closes_at THEN
    RETURN false;
  END IF;
  IF now() > coalesce(ev.ends_at, ev.starts_at) THEN
    RETURN false;
  END IF;

  IF _tier_id IS NOT NULL THEN
    SELECT * INTO tier FROM public.event_ticket_tiers WHERE id = _tier_id;
    IF NOT FOUND OR tier.event_id <> _event_id OR NOT tier.is_active THEN
      RETURN false;
    END IF;
    IF tier.capacity IS NOT NULL
       AND private.event_tier_taken_count(tier.id) >= tier.capacity THEN
      RETURN true;
    END IF;
  END IF;

  RETURN ev.capacity IS NOT NULL
     AND private.event_confirmed_count(_event_id) >= ev.capacity;
END;
$$;

REVOKE ALL ON FUNCTION private.event_waitlist_open(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.event_waitlist_open(uuid, uuid) TO anon, authenticated;

-- Does this email hold a live waitlist invitation for this event/tier?
CREATE OR REPLACE FUNCTION private.has_live_waitlist_invite(
  _event_id uuid, _tier_id uuid, _email text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_waitlist_entries w
     WHERE w.event_id = _event_id
       AND w.status = 'invited'
       AND w.invite_expires_at IS NOT NULL
       AND w.invite_expires_at > now()
       AND lower(w.email) = lower(coalesce(_email, ''))
       AND (w.tier_id IS NULL OR _tier_id IS NULL OR w.tier_id = _tier_id)
  )
$$;

REVOKE ALL ON FUNCTION private.has_live_waitlist_invite(uuid, uuid, text) FROM PUBLIC;

-- Joining is public, but only for a full event, and only as a fresh entry.
CREATE POLICY "anyone joins a full waitlist" ON public.event_waitlist_entries
FOR INSERT TO anon, authenticated
WITH CHECK (
  private.event_waitlist_open(event_id, tier_id)
);

CREATE POLICY "organizers read their waitlist" ON public.event_waitlist_entries
FOR SELECT TO authenticated
USING (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "organizers manage their waitlist" ON public.event_waitlist_entries
FOR UPDATE TO authenticated
USING (private.event_is_managed_by(event_id, auth.uid()))
WITH CHECK (private.event_is_managed_by(event_id, auth.uid()));

CREATE POLICY "organizers remove waitlist entries" ON public.event_waitlist_entries
FOR DELETE TO authenticated
USING (private.event_is_managed_by(event_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Registration guard: an invited waitlist guest may take a sold-out seat, and
-- the staff-only cancellation note stays server-owned.
-- ---------------------------------------------------------------------------
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
  invited boolean := false;
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
    NEW.discount_code_id = OLD.discount_code_id;
  END IF;

  -- The discount snapshot is written by this trigger only; nobody else may
  -- touch it, so an edited code can never rewrite a historical price.
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
    NEW.cancellation_note = OLD.cancellation_note;
    NEW.cancel_token_hash = OLD.cancel_token_hash;
    NEW.discount_code_text = OLD.discount_code_text;
    NEW.discount_type = OLD.discount_type;
    NEW.discount_value = OLD.discount_value;
    NEW.discount_amount_cents = OLD.discount_amount_cents;
  END IF;

  IF TG_OP = 'INSERT' AND NOT trusted THEN
    NEW.cancellation_note = NULL;
    NEW.cancel_token_hash = NULL;
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

  -- A live waitlist invitation is what makes a sold-out seat reachable.
  invited := private.has_live_waitlist_invite(NEW.event_id, NEW.tier_id, NEW.email);

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

    -- The discount is recomputed here from the stored code, never taken from
    -- the client, and the resulting snapshot is what the row keeps.
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
        discount := round(dc.discount_value * 100);
      END IF;
      discount := least(greatest(discount, 0), tier.price_cents);

      NEW.amount_cents = tier.price_cents - discount;
      NEW.discount_code_text = dc.code;
      NEW.discount_type = dc.discount_type;
      NEW.discount_value = dc.discount_value;
      NEW.discount_amount_cents = discount;
    ELSE
      NEW.discount_code_text = NULL;
      NEW.discount_type = NULL;
      NEW.discount_value = NULL;
      NEW.discount_amount_cents = 0;
    END IF;

    IF NEW.amount_cents = 0 THEN
      NEW.payment_status = 'not_required';
      NEW.hold_expires_at = NULL;
    ELSIF NOT trusted AND NOT manager AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
      NEW.payment_status = 'pending';
      NEW.hold_expires_at = least(
        coalesce(NEW.hold_expires_at, now() + interval '30 minutes'),
        now() + interval '30 minutes'
      );
    END IF;

    IF tier.capacity IS NOT NULL AND NOT invited THEN
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
    NEW.discount_code_id = NULL;
    NEW.discount_code_text = NULL;
    NEW.discount_type = NULL;
    NEW.discount_value = NULL;
    NEW.discount_amount_cents = 0;
  END IF;

  RETURN NEW;
END; $function$;