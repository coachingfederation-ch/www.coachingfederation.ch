CREATE TABLE public.member_credit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_on date NOT NULL,
  title text NOT NULL,
  provider text,
  cc_hours numeric(6,2) NOT NULL DEFAULT 0 CHECK (cc_hours >= 0 AND cc_hours <= 999),
  rd_hours numeric(6,2) NOT NULL DEFAULT 0 CHECK (rd_hours >= 0 AND rd_hours <= 999),
  note text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_credit_entries TO authenticated;
GRANT ALL ON public.member_credit_entries TO service_role;

ALTER TABLE public.member_credit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own credit entries select" ON public.member_credit_entries
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own credit entries insert" ON public.member_credit_entries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own credit entries update" ON public.member_credit_entries
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own credit entries delete" ON public.member_credit_entries
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX member_credit_entries_user_date_idx
  ON public.member_credit_entries (user_id, occurred_on DESC);

CREATE TRIGGER member_credit_entries_touch
  BEFORE UPDATE ON public.member_credit_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.member_credit_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_credit_settings TO authenticated;
GRANT ALL ON public.member_credit_settings TO service_role;

ALTER TABLE public.member_credit_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own credit settings select" ON public.member_credit_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own credit settings insert" ON public.member_credit_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own credit settings update" ON public.member_credit_settings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own credit settings delete" ON public.member_credit_settings
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER member_credit_settings_touch
  BEFORE UPDATE ON public.member_credit_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();