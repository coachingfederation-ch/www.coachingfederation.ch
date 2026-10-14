-- Advertise with us (MVP-1)
--
-- Members configure an advertising package, staff price it from a versioned
-- rate card, review it, approve it, generate a contract and only after marking
-- that contract signed do placements go live. There is no online payment and
-- no self-service publishing: the transition guard below is the boundary that
-- makes that true even for a direct API call.

-- ---------------------------------------------------------------- vocabulary

DO $$ BEGIN
  CREATE TYPE public.ad_offer_type AS ENUM ('partner_package', 'eannouncement', 'school');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_request_status AS ENUM (
    'draft', 'submitted', 'under_review', 'approved', 'declined',
    'contract_sent', 'contract_signed', 'active', 'expired', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_placement_type AS ENUM (
    'homepage', 'event_banner', 'newsletter', 'square_advert', 'eannouncement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- The e-announcement price is derived from the member's own record, never
-- chosen by the member.
DO $$ BEGIN
  CREATE TYPE public.ad_eligibility_tier AS ENUM ('icfs_member', 'icf_global');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------- rate cards

CREATE TABLE IF NOT EXISTS public.ad_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  valid_from date NOT NULL DEFAULT current_date,
  is_active boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'CHF',
  -- Gold/Silver/Bronze × 12/6 months, with the placements each includes.
  packages jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { "icfs_member": 150, "icf_global": 300 }
  eannouncement_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { "square_advert": { "12": 1500, ... }, ... }
  school_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Staff-configurable sanity guard on the wizard input only. Never priced:
  -- partner packages include all newsletters.
  newsletter_mentions_guard integer NOT NULL DEFAULT 12,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_rate_cards_single_active
  ON public.ad_rate_cards (is_active) WHERE is_active;

GRANT SELECT ON public.ad_rate_cards TO authenticated;
GRANT ALL ON public.ad_rate_cards TO service_role;
ALTER TABLE public.ad_rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active rate card readable by signed-in members"
  ON public.ad_rate_cards FOR SELECT TO authenticated
  USING (is_active);

CREATE POLICY "administrators manage rate cards"
  ON public.ad_rate_cards FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));

-- ----------------------------------------------------------------- requests

CREATE TABLE IF NOT EXISTS public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  offer_type public.ad_offer_type NOT NULL,
  package text,
  placements public.ad_placement_type[] NOT NULL DEFAULT '{}',
  duration_months integer,
  -- Informational only: it never enters pricing.
  newsletter_mentions integer NOT NULL DEFAULT 0,
  -- Server-derived from the member's membership + credential record.
  eligibility_tier public.ad_eligibility_tier,
  eligibility_source text NOT NULL DEFAULT 'derived',
  eligibility_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- { organisation, program_type, accreditation_reference, attested_at }
  school_attestation jsonb,
  advertiser_name text,
  contact_email text,
  logo_path text,
  description_de text,
  description_fr text,
  description_it text,
  description_en text,
  cta_url text,
  announcement_date date,
  requested_start date,
  computed_price integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CHF',
  rate_card_id uuid REFERENCES public.ad_rate_cards(id) ON DELETE SET NULL,
  status public.ad_request_status NOT NULL DEFAULT 'draft',
  staff_notes text,
  decline_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  contract_sent_at timestamptz,
  active_from date,
  active_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_requests_created_by_idx ON public.ad_requests (created_by);
CREATE INDEX IF NOT EXISTS ad_requests_status_idx ON public.ad_requests (status);

GRANT SELECT, INSERT, UPDATE ON public.ad_requests TO authenticated;
GRANT ALL ON public.ad_requests TO service_role;
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own ad requests"
  ON public.ad_requests FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "members create own ad requests"
  ON public.ad_requests FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Only while still a draft: everything after submission is staff territory.
CREATE POLICY "members edit own draft ad requests"
  ON public.ad_requests FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND status = 'draft')
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "administrators manage ad requests"
  ON public.ad_requests FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));

-- ---------------------------------------------------------------- contracts

CREATE TABLE IF NOT EXISTS public.ad_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ad_requests(id) ON DELETE CASCADE,
  template_version text NOT NULL DEFAULT 'v1',
  advertiser_name text NOT NULL DEFAULT '',
  advertiser_address text,
  price integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CHF',
  payment_terms text NOT NULL DEFAULT '30 days net, invoiced on activation.',
  signed_at_advertiser timestamptz,
  signed_at_icf timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);

GRANT SELECT ON public.ad_contracts TO authenticated;
GRANT ALL ON public.ad_contracts TO service_role;
ALTER TABLE public.ad_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own contract"
  ON public.ad_contracts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ad_requests r
    WHERE r.id = request_id AND r.created_by = auth.uid()
  ));

CREATE POLICY "administrators manage contracts"
  ON public.ad_contracts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));

-- --------------------------------------------------------------- placements

CREATE TABLE IF NOT EXISTS public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ad_requests(id) ON DELETE CASCADE,
  placement_type public.ad_placement_type NOT NULL,
  advertiser_name text NOT NULL DEFAULT '',
  description_de text,
  description_fr text,
  description_it text,
  description_en text,
  cta_url text,
  logo_path text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  clicks_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_placements_live_idx
  ON public.ad_placements (placement_type, start_date, end_date) WHERE is_active;

-- Public surfaces read only the fields a visitor sees on the card.
GRANT SELECT (
  id, placement_type, advertiser_name,
  description_de, description_fr, description_it, description_en,
  cta_url, logo_path, start_date, end_date, is_active
) ON public.ad_placements TO anon, authenticated;
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live placements are public"
  ON public.ad_placements FOR SELECT TO anon, authenticated
  USING (is_active AND start_date <= current_date AND end_date >= current_date);

CREATE POLICY "administrators manage placements"
  ON public.ad_placements FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));

-- -------------------------------------------------------------- audit trail

CREATE TABLE IF NOT EXISTS public.ad_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.ad_requests(id) ON DELETE CASCADE,
  actor_user_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_request_events_request_idx
  ON public.ad_request_events (request_id, created_at DESC);

GRANT SELECT ON public.ad_request_events TO authenticated;
GRANT ALL ON public.ad_request_events TO service_role;
ALTER TABLE public.ad_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own request history"
  ON public.ad_request_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ad_requests r
    WHERE r.id = request_id AND r.created_by = auth.uid()
  ));

CREATE POLICY "administrators read request history"
  ON public.ad_request_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));

-- --------------------------------------------------------- transition guard

-- The same state machine the server layer enforces, repeated here so a direct
-- API call cannot skip review, price its own request, or go live without a
-- signed contract.
CREATE OR REPLACE FUNCTION public.tg_ads_transition_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  staff boolean := auth.uid() IS NOT NULL
    AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'administrator'));
  legal text[];
BEGIN
  NEW.updated_at = now();

  IF TG_OP = 'INSERT' THEN
    IF NOT trusted AND NOT staff THEN
      -- A member may only ever create a draft, and never price it.
      NEW.status = 'draft';
      NEW.computed_price = 0;
      NEW.staff_notes = NULL;
      NEW.decline_reason = NULL;
      NEW.submitted_at = NULL;
      NEW.reviewed_at = NULL;
      NEW.approved_at = NULL;
      NEW.contract_sent_at = NULL;
      NEW.active_from = NULL;
      NEW.active_until = NULL;
      NEW.eligibility_source = 'derived';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT trusted AND NOT staff THEN
    NEW.status = OLD.status;
    NEW.computed_price = OLD.computed_price;
    NEW.currency = OLD.currency;
    NEW.rate_card_id = OLD.rate_card_id;
    NEW.eligibility_tier = OLD.eligibility_tier;
    NEW.eligibility_source = OLD.eligibility_source;
    NEW.staff_notes = OLD.staff_notes;
    NEW.decline_reason = OLD.decline_reason;
    NEW.submitted_at = OLD.submitted_at;
    NEW.reviewed_at = OLD.reviewed_at;
    NEW.approved_at = OLD.approved_at;
    NEW.contract_sent_at = OLD.contract_sent_at;
    NEW.active_from = OLD.active_from;
    NEW.active_until = OLD.active_until;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    legal := CASE NEW.status
      WHEN 'submitted' THEN ARRAY['draft']
      WHEN 'under_review' THEN ARRAY['submitted']
      WHEN 'approved' THEN ARRAY['submitted', 'under_review']
      WHEN 'declined' THEN ARRAY['submitted', 'under_review']
      WHEN 'contract_sent' THEN ARRAY['approved']
      WHEN 'contract_signed' THEN ARRAY['approved', 'contract_sent']
      WHEN 'active' THEN ARRAY['contract_signed']
      WHEN 'expired' THEN ARRAY['active']
      WHEN 'cancelled' THEN ARRAY['draft', 'submitted', 'under_review', 'approved', 'contract_sent', 'contract_signed', 'active']
      WHEN 'draft' THEN ARRAY['submitted']
      ELSE ARRAY[]::text[]
    END;
    IF NOT (OLD.status::text = ANY (legal)) THEN
      RAISE EXCEPTION 'an ad request cannot move from % to %', OLD.status, NEW.status;
    END IF;
    -- Going live requires a contract signed by both parties.
    IF NEW.status = 'contract_signed' AND NOT EXISTS (
      SELECT 1 FROM public.ad_contracts c
      WHERE c.request_id = NEW.id
        AND c.signed_at_advertiser IS NOT NULL
        AND c.signed_at_icf IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'the contract must be signed by both parties first';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ads_transition_guard ON public.ad_requests;
CREATE TRIGGER ads_transition_guard
  BEFORE INSERT OR UPDATE ON public.ad_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_ads_transition_guard();

DROP TRIGGER IF EXISTS ad_rate_cards_touch ON public.ad_rate_cards;
CREATE TRIGGER ad_rate_cards_touch BEFORE UPDATE ON public.ad_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS ad_contracts_touch ON public.ad_contracts;
CREATE TRIGGER ad_contracts_touch BEFORE UPDATE ON public.ad_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS ad_placements_touch ON public.ad_placements;
CREATE TRIGGER ad_placements_touch BEFORE UPDATE ON public.ad_placements
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ---------------------------------------------------------------- rate card v1

INSERT INTO public.ad_rate_cards (version, is_active, packages, eannouncement_prices, school_prices, notes)
SELECT
  1,
  true,
  '{
    "gold":   { "label": "Gold",   "placements": ["square_advert", "event_banner", "homepage", "newsletter"], "prices": { "12": 2500, "6": 1350 } },
    "silver": { "label": "Silver", "placements": ["square_advert", "event_banner", "newsletter"],             "prices": { "12": 2000, "6": 1150 } },
    "bronze": { "label": "Bronze", "placements": ["square_advert", "newsletter"],                             "prices": { "12": 1500, "6": 800 } }
  }'::jsonb,
  '{ "icfs_member": 150, "icf_global": 300 }'::jsonb,
  '{
    "square_advert": { "12": 1500, "6": 1200, "3": 1000 },
    "newsletter":    { "12": 1500, "6": 800,  "3": 600 },
    "event_banner":  { "3": 1200, "1": 550 }
  }'::jsonb,
  'Seeded rate card v1. All amounts in CHF; partner packages include all newsletters.'
WHERE NOT EXISTS (SELECT 1 FROM public.ad_rate_cards);

-- ------------------------------------------------------------ click tracking

-- Counted through a definer function so the public grant stays read-only on
-- the table itself: a visitor may increment the counter, never edit a row.
CREATE OR REPLACE FUNCTION public.ad_placement_click(_placement_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ad_placements
     SET clicks_count = clicks_count + 1
   WHERE id = _placement_id
     AND is_active
     AND start_date <= current_date
     AND end_date >= current_date;
$$;

GRANT EXECUTE ON FUNCTION public.ad_placement_click(uuid) TO anon, authenticated, service_role;

-- ------------------------------------------- newsletter advertisement blocks

-- An advertisement block may point at an approved placement; the editor picks
-- it and the edition renders the advertiser's logo, text and link.
ALTER TABLE public.newsletter_blocks
  ADD COLUMN IF NOT EXISTS ad_placement_id uuid
  REFERENCES public.ad_placements(id) ON DELETE SET NULL;

-- Set once the 30-day expiry reminder has gone out, so the nightly upkeep job
-- never mails the same advertiser twice.
ALTER TABLE public.ad_requests
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz;
