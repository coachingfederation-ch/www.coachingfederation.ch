CREATE TABLE public.member_claim_campaign (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','paused','completed')),
  daily_cap integer NOT NULL DEFAULT 50 CHECK (daily_cap BETWEEN 1 AND 500),
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_after_days integer NOT NULL DEFAULT 7 CHECK (reminder_after_days BETWEEN 1 AND 60),
  last_run_on date,
  last_run_at timestamptz,
  last_run_sent integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  paused_reason text,
  total_invited integer NOT NULL DEFAULT 0,
  total_reminders integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.member_claim_campaign TO authenticated;
GRANT ALL ON public.member_claim_campaign TO service_role;

ALTER TABLE public.member_claim_campaign ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read claim campaign"
ON public.member_claim_campaign FOR SELECT TO authenticated
USING (private.is_editor(auth.uid()));

CREATE TRIGGER member_claim_campaign_touch
BEFORE UPDATE ON public.member_claim_campaign
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

INSERT INTO public.member_claim_campaign (id) VALUES (true);

CREATE TABLE public.member_claim_pilot (
  member_id uuid NOT NULL PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.member_claim_pilot TO authenticated;
GRANT ALL ON public.member_claim_pilot TO service_role;

ALTER TABLE public.member_claim_pilot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read claim pilot list"
ON public.member_claim_pilot FOR SELECT TO authenticated
USING (private.is_editor(auth.uid()));