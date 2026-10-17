CREATE TABLE public.op_assignment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  assignment_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'unassigned')),
  member_id uuid NOT NULL,
  project_id uuid NOT NULL,
  role_id uuid NOT NULL,
  member_name text,
  project_name text,
  role_name text,
  actor_id uuid,
  actor_name text
);
GRANT SELECT ON public.op_assignment_audit_log TO authenticated;
GRANT SELECT ON public.op_assignment_audit_log TO service_role;
ALTER TABLE public.op_assignment_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read assignment history"
  ON public.op_assignment_audit_log FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));
CREATE INDEX op_assignment_audit_recent_idx ON public.op_assignment_audit_log (created_at DESC, id DESC);
CREATE INDEX op_assignment_audit_project_idx ON public.op_assignment_audit_log (project_id, created_at DESC, id DESC);
COMMENT ON TABLE public.op_assignment_audit_log IS 'Private append-only volunteer assignment history. Name snapshots preserve context after renames/deletion; no email or member number snapshots. History begins when the trigger is installed.';
CREATE FUNCTION private.tg_op_assignment_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_label text;
  previous_member text;
  previous_project text;
  previous_role text;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.member_id, OLD.project_id, OLD.role_id) IS NOT DISTINCT FROM (NEW.member_id, NEW.project_id, NEW.role_id) THEN
    RETURN NEW;
  END IF;
  SELECT nullif(trim(concat_ws(' ', p.first_name, p.last_name)), '') INTO actor_label
    FROM public.profiles p WHERE p.id = actor;
  IF actor_label IS NULL AND actor IS NOT NULL THEN
    SELECT m.full_name INTO actor_label FROM public.members m WHERE m.auth_user_id = actor LIMIT 1;
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    SELECT m.full_name INTO previous_member FROM public.members m WHERE m.id = OLD.member_id;
    SELECT p.name INTO previous_project FROM public.op_projects p WHERE p.id = OLD.project_id;
    SELECT r.name INTO previous_role FROM public.op_project_roles r WHERE r.id = OLD.role_id;
    -- Cascading deletion may have already hidden the parent; retain its last audit snapshot.
    IF previous_member IS NULL OR previous_project IS NULL OR previous_role IS NULL THEN
      SELECT coalesce(previous_member, a.member_name), coalesce(previous_project, a.project_name), coalesce(previous_role, a.role_name)
        INTO previous_member, previous_project, previous_role
        FROM public.op_assignment_audit_log a WHERE a.assignment_id = OLD.id ORDER BY a.created_at DESC, a.id DESC LIMIT 1;
    END IF;
    INSERT INTO public.op_assignment_audit_log (assignment_id, action, member_id, project_id, role_id, member_name, project_name, role_name, actor_id, actor_name)
      VALUES (OLD.id, 'unassigned', OLD.member_id, OLD.project_id, OLD.role_id, previous_member, previous_project, previous_role, actor, actor_label);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.op_assignment_audit_log (assignment_id, action, member_id, project_id, role_id, member_name, project_name, role_name, actor_id, actor_name)
      SELECT NEW.id, 'assigned', NEW.member_id, NEW.project_id, NEW.role_id, m.full_name, p.name, r.name, actor, actor_label
      FROM public.members m CROSS JOIN public.op_projects p CROSS JOIN public.op_project_roles r
      WHERE m.id = NEW.member_id AND p.id = NEW.project_id AND r.id = NEW.role_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.tg_op_assignment_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER op_assignments_audit BEFORE INSERT OR UPDATE OR DELETE ON public.op_assignments
  FOR EACH ROW EXECUTE FUNCTION private.tg_op_assignment_audit();