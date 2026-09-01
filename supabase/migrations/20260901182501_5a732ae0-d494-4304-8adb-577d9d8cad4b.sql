CREATE TABLE public.member_engagement_campaigns (
  key text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'off' CHECK (mode IN ('off','automatic','queued')),
  daily_cap integer NOT NULL DEFAULT 50 CHECK (daily_cap >= 0 AND daily_cap <= 1000),
  copy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.member_engagement_campaigns TO authenticated;
GRANT ALL ON public.member_engagement_campaigns TO service_role;
ALTER TABLE public.member_engagement_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membership staff can read engagement campaigns"
  ON public.member_engagement_campaigns FOR SELECT TO authenticated
  USING (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()));

CREATE TABLE public.member_engagement_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL REFERENCES public.member_engagement_campaigns(key) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  dedupe_key text NOT NULL UNIQUE,
  sync_run_id uuid REFERENCES public.member_sync_runs(id) ON DELETE SET NULL,
  trigger_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','skipped','suppressed','failed')),
  error_message text,
  released_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX member_engagement_sends_campaign_status_idx
  ON public.member_engagement_sends (campaign_key, status, created_at DESC);
CREATE INDEX member_engagement_sends_member_idx
  ON public.member_engagement_sends (member_id);

GRANT SELECT ON public.member_engagement_sends TO authenticated;
GRANT ALL ON public.member_engagement_sends TO service_role;
ALTER TABLE public.member_engagement_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membership staff can read engagement sends"
  ON public.member_engagement_sends FOR SELECT TO authenticated
  USING (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()));

CREATE TRIGGER member_engagement_campaigns_touch
  BEFORE UPDATE ON public.member_engagement_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER member_engagement_sends_touch
  BEFORE UPDATE ON public.member_engagement_sends
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

INSERT INTO public.member_engagement_campaigns (key, mode, daily_cap, copy) VALUES
('welcome_new_member','off',50,'{"en":{"subject":"Welcome to The Switzerland Chapter of ICF","body":"Hi {{first_name}},\n\nWelcome to The Switzerland Chapter of ICF. We are glad you are here.\n\nAs a member you can join our chapter events, meet coaches in your region, and take part in our communities across Switzerland.\n\nA good first step is to look at what is coming up and pick one event to attend.\n\nWarm regards,\nThe Switzerland Chapter of ICF"}}'::jsonb),
('credential_upgrade','off',50,'{"en":{"subject":"Congratulations on your {{credential_to}} credential","body":"Hi {{first_name}},\n\nCongratulations on moving from {{credential_from}} to {{credential_to}}. That is a real milestone, and we are glad to have you in the chapter.\n\nIf you would like to share what you learned along the way, our communities and events are always looking for member voices.\n\nWarm regards,\nThe Switzerland Chapter of ICF"}}'::jsonb),
('credential_specialisation','off',50,'{"en":{"subject":"Congratulations on your {{specialisation}} specialisation","body":"Hi {{first_name}},\n\nCongratulations on earning your {{specialisation}} specialisation. Thank you for deepening the practice of coaching in Switzerland.\n\nWarm regards,\nThe Switzerland Chapter of ICF"}}'::jsonb),
('grace_reengagement','off',50,'{"en":{"subject":"We would like to stay in touch","body":"Hi {{first_name}},\n\nYour ICF membership no longer appears in our chapter records, so your Member Area access will end on {{grace_end_date}}.\n\nIf that was not your intention, or if you would simply like to talk it through, one of our chapter leaders is happy to have a conversation with you: {{leader_link}}\n\nWarm regards,\nThe Switzerland Chapter of ICF"}}'::jsonb);