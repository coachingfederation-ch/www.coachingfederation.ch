ALTER TABLE public.internal_accounts
  ADD COLUMN IF NOT EXISTS invite_token_hash text,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_used_at timestamptz;

CREATE INDEX IF NOT EXISTS internal_accounts_invite_token_hash_idx
  ON public.internal_accounts (invite_token_hash);