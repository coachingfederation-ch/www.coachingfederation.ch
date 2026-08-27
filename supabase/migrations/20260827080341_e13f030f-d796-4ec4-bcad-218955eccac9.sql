CREATE TABLE public.live_chat_device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_chat_device_tokens_user_id_idx ON public.live_chat_device_tokens (user_id);

GRANT ALL ON public.live_chat_device_tokens TO service_role;

ALTER TABLE public.live_chat_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER live_chat_device_tokens_touch
  BEFORE UPDATE ON public.live_chat_device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();