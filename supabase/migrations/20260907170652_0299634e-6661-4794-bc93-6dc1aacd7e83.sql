ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS pending_email text,
  ADD COLUMN IF NOT EXISTS pending_email_since timestamptz,
  ADD COLUMN IF NOT EXISTS email_change_state text NOT NULL DEFAULT 'none';

ALTER TABLE public.members
  ADD CONSTRAINT members_email_change_state_check
  CHECK (email_change_state IN ('none','pending','sent','blocked'));

CREATE INDEX IF NOT EXISTS members_email_change_state_idx
  ON public.members (email_change_state)
  WHERE email_change_state <> 'none';

COMMENT ON COLUMN public.members.pending_email IS
  'Address ICF Global reports for a member whose auth account still signs in with the old one. Never authoritative: the member must confirm it before the sign-in address moves.';
