-- Volunteer roster (informational only)
CREATE TABLE public.live_chat_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  volunteer_name text NOT NULL DEFAULT '',
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chat_shifts TO authenticated;
GRANT ALL ON public.live_chat_shifts TO service_role;
ALTER TABLE public.live_chat_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in people can read shifts" ON public.live_chat_shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage shifts" ON public.live_chat_shifts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER live_chat_shifts_touch BEFORE UPDATE ON public.live_chat_shifts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Volunteer presence
CREATE TABLE public.live_chat_presence (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.live_chat_presence TO authenticated;
GRANT ALL ON public.live_chat_presence TO service_role;
ALTER TABLE public.live_chat_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in people see who is online" ON public.live_chat_presence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Volunteers manage their own presence" ON public.live_chat_presence
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Volunteers update their own presence" ON public.live_chat_presence
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER live_chat_presence_touch BEFORE UPDATE ON public.live_chat_presence
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Conversations
CREATE TABLE public.live_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key_hash text NOT NULL UNIQUE,
  visitor_name text NOT NULL DEFAULT '',
  visitor_email text,
  locale text NOT NULL DEFAULT 'en',
  page_path text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  volunteer_user_id uuid,
  volunteer_name text,
  accepted_at timestamptz,
  ended_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_chat_conversations_status_idx ON public.live_chat_conversations (status, created_at DESC);
CREATE INDEX live_chat_conversations_volunteer_idx ON public.live_chat_conversations (volunteer_user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.live_chat_conversations TO authenticated;
GRANT ALL ON public.live_chat_conversations TO service_role;
ALTER TABLE public.live_chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Volunteers see waiting and their own conversations" ON public.live_chat_conversations
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR volunteer_user_id = auth.uid()
    OR (status = 'waiting' AND private.has_role(auth.uid(), 'member'))
  );
CREATE POLICY "Volunteers claim and close conversations" ON public.live_chat_conversations
  FOR UPDATE TO authenticated
  USING (
    volunteer_user_id = auth.uid()
    OR (status = 'waiting' AND private.has_role(auth.uid(), 'member'))
  )
  WITH CHECK (volunteer_user_id = auth.uid());
CREATE TRIGGER live_chat_conversations_touch BEFORE UPDATE ON public.live_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Messages
CREATE TABLE public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.live_chat_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('visitor', 'volunteer', 'system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_chat_messages_conversation_idx ON public.live_chat_messages (conversation_id, created_at);
GRANT SELECT, INSERT ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read messages of readable conversations" ON public.live_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.live_chat_conversations c
    WHERE c.id = conversation_id
      AND (private.has_role(auth.uid(), 'admin') OR c.volunteer_user_id = auth.uid())
  ));
CREATE POLICY "Volunteers write into their own conversations" ON public.live_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'volunteer'
    AND EXISTS (
      SELECT 1 FROM public.live_chat_conversations c
      WHERE c.id = conversation_id AND c.volunteer_user_id = auth.uid() AND c.status = 'active'
    )
  );

-- Public online count: number only, no identities
CREATE OR REPLACE FUNCTION public.live_chat_online_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.live_chat_presence
  WHERE is_online AND last_seen_at > now() - interval '90 seconds'
$$;
REVOKE ALL ON FUNCTION public.live_chat_online_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_chat_online_count() TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_presence;