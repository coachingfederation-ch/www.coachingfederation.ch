ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advertiser';

CREATE TABLE IF NOT EXISTS public.advertiser_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  billing_country text NOT NULL,
  billing_postcode text NOT NULL,
  billing_city text NOT NULL,
  billing_street text NOT NULL,
  vat_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.advertiser_profiles TO authenticated;
GRANT ALL ON public.advertiser_profiles TO service_role;
ALTER TABLE public.advertiser_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advertisers read own profile"
  ON public.advertiser_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "advertisers update own profile"
  ON public.advertiser_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "advertisers insert own profile"
  ON public.advertiser_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "administrators and membership read advertiser profiles"
  ON public.advertiser_profiles FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'administrator')
    OR private.has_role(auth.uid(), 'membership')
  );

DROP TRIGGER IF EXISTS advertiser_profiles_touch ON public.advertiser_profiles;
CREATE TRIGGER advertiser_profiles_touch
  BEFORE UPDATE ON public.advertiser_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE OR REPLACE FUNCTION public.complete_advertiser_onboarding(
  _organisation text,
  _contact_name text,
  _phone text,
  _billing_country text,
  _billing_postcode text,
  _billing_city text,
  _billing_street text,
  _vat_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF coalesce(trim(_organisation), '') = '' OR coalesce(trim(_contact_name), '') = ''
     OR coalesce(trim(_billing_country), '') = '' OR coalesce(trim(_billing_city), '') = ''
     OR coalesce(trim(_billing_postcode), '') = '' OR coalesce(trim(_billing_street), '') = '' THEN
    RAISE EXCEPTION 'Missing required profile fields';
  END IF;

  INSERT INTO public.advertiser_profiles AS p
    (user_id, organisation, contact_name, phone, billing_country, billing_postcode,
     billing_city, billing_street, vat_number)
  VALUES
    (_uid, left(trim(_organisation), 200), left(trim(_contact_name), 200), left(nullif(trim(_phone), ''), 50),
     left(trim(_billing_country), 100), left(trim(_billing_postcode), 20), left(trim(_billing_city), 100),
     left(trim(_billing_street), 200), left(nullif(trim(_vat_number), ''), 50))
  ON CONFLICT (user_id) DO UPDATE SET
    organisation = excluded.organisation,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    billing_country = excluded.billing_country,
    billing_postcode = excluded.billing_postcode,
    billing_city = excluded.billing_city,
    billing_street = excluded.billing_street,
    vat_number = excluded.vat_number;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'advertiser'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_advertiser_onboarding(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_advertiser_onboarding(text, text, text, text, text, text, text, text) TO authenticated;

ALTER TABLE public.ad_requests
  ADD COLUMN IF NOT EXISTS requester_kind text NOT NULL DEFAULT 'member'
  CHECK (requester_kind IN ('member', 'external'));

CREATE POLICY "only members or advertisers create ad requests"
  ON public.ad_requests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role::text IN ('member', 'advertiser', 'admin', 'administrator')
    )
  );