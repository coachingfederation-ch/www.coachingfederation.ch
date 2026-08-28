CREATE TABLE public.community_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.op_projects(id) ON DELETE CASCADE,
  notified_emails text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_join_requests_member_project_idx
  ON public.community_join_requests (member_id, project_id, created_at DESC);

GRANT SELECT, INSERT ON public.community_join_requests TO authenticated;
GRANT ALL ON public.community_join_requests TO service_role;

ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own join requests"
  ON public.community_join_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = community_join_requests.member_id
        AND m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Members create their own join requests"
  ON public.community_join_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = community_join_requests.member_id
        AND m.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff read all join requests"
  ON public.community_join_requests FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));