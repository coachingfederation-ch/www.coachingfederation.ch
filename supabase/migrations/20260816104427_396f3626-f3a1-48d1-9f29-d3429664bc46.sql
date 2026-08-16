CREATE TABLE public.live_chat_volunteers (
  user_id uuid PRIMARY KEY,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT '',
  activated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chat_volunteers TO authenticated;
GRANT ALL ON public.live_chat_volunteers TO service_role;

ALTER TABLE public.live_chat_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage volunteers"
  ON public.live_chat_volunteers FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

CREATE POLICY "Volunteers read their own activation"
  ON public.live_chat_volunteers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Volunteers opt out of their own activation"
  ON public.live_chat_volunteers FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER live_chat_volunteers_touch
  BEFORE UPDATE ON public.live_chat_volunteers
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE OR REPLACE FUNCTION private.is_live_chat_volunteer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_chat_volunteers v WHERE v.user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION private.is_live_chat_volunteer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_live_chat_volunteer(uuid) TO authenticated, service_role;

-- Only activated volunteers (or admins) reach conversations and presence.
DROP POLICY "Volunteers see waiting and their own conversations" ON public.live_chat_conversations;
CREATE POLICY "Volunteers see waiting and their own conversations"
  ON public.live_chat_conversations FOR SELECT TO authenticated
  USING (
    private.is_platform_admin(auth.uid())
    OR volunteer_user_id = auth.uid()
    OR (status = 'waiting' AND private.is_live_chat_volunteer(auth.uid()))
  );

DROP POLICY "Volunteers claim and close conversations" ON public.live_chat_conversations;
CREATE POLICY "Volunteers claim and close conversations"
  ON public.live_chat_conversations FOR UPDATE TO authenticated
  USING (
    volunteer_user_id = auth.uid()
    OR (status = 'waiting' AND private.is_live_chat_volunteer(auth.uid()))
  )
  WITH CHECK (volunteer_user_id = auth.uid());

DROP POLICY "Volunteers and staff see who is online" ON public.live_chat_presence;
CREATE POLICY "Volunteers and staff see who is online"
  ON public.live_chat_presence FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.is_live_chat_volunteer(auth.uid())
    OR private.is_platform_admin(auth.uid())
  );

DROP POLICY "Volunteers manage their own presence" ON public.live_chat_presence;
CREATE POLICY "Volunteers manage their own presence"
  ON public.live_chat_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.is_live_chat_volunteer(auth.uid()));

DROP TABLE IF EXISTS public.live_chat_shifts;