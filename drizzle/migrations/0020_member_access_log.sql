CREATE TABLE public.member_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('members_list','members_export','member_detail','members_list_blocked','members_export_blocked','member_detail_blocked')),
  subject_member_id uuid,
  row_count integer,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_access_log TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.member_access_log TO service_role;
ALTER TABLE public.member_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read member access log" ON public.member_access_log
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX member_access_log_created_idx ON public.member_access_log (created_at DESC);
CREATE INDEX member_access_log_actor_idx ON public.member_access_log (actor_user_id);
COMMENT ON TABLE public.member_access_log IS 'Append-only trail of staff reads of member PII (list, export, detail). Written by server code only; admins read.';