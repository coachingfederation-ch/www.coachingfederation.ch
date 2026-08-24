CREATE TABLE public.live_chat_apns_subscriptions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token text NOT NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_token)
);
GRANT ALL ON public.live_chat_apns_subscriptions TO service_role;
ALTER TABLE public.live_chat_apns_subscriptions ENABLE ROW LEVEL SECURITY;