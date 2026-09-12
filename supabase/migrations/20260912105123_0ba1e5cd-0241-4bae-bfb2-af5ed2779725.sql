ALTER TABLE public.member_claim_campaign
  ADD COLUMN IF NOT EXISTS pilot_only boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.member_claim_campaign.pilot_only IS
  'When true the wave engine only invites members on the pilot list and marks the campaign completed once that list is exhausted.';