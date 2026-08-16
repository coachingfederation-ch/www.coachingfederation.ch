CREATE TABLE public.live_chat_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_chat_login_tokens_user_idx ON public.live_chat_login_tokens (user_id);
GRANT ALL ON public.live_chat_login_tokens TO service_role;
ALTER TABLE public.live_chat_login_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.live_chat_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX live_chat_push_subscriptions_user_idx ON public.live_chat_push_subscriptions (user_id);
GRANT ALL ON public.live_chat_push_subscriptions TO service_role;
ALTER TABLE public.live_chat_push_subscriptions ENABLE ROW LEVEL SECURITY;