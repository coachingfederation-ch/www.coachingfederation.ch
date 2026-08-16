-- Super Admin = the existing 'admin' grant (migration-provisioned).
-- Administrator = the new, assignable 'administrator' grant with a scoped set
-- of CMS areas. Fail-safe by design: anything still checking 'admin' stays
-- Super-Admin-only, so a missed spot narrows access rather than widening it.
CREATE OR REPLACE FUNCTION private.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.has_role(_user_id, 'admin')
      OR private.has_role(_user_id, 'administrator')
$$;

-- ---------------------------------------------------------------- knowledge
DROP POLICY "Admins manage knowledge" ON public.assistant_knowledge;
CREATE POLICY "Platform admins manage knowledge" ON public.assistant_knowledge
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

-- ------------------------------------------------------------ chat insights
DROP POLICY "Admins read chat interaction logs" ON public.chat_interaction_logs;
CREATE POLICY "Platform admins read chat interaction logs" ON public.chat_interaction_logs
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins manage chat categories" ON public.chat_question_categories;
CREATE POLICY "Platform admins manage chat categories" ON public.chat_question_categories
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read chat categories" ON public.chat_question_categories;
CREATE POLICY "Platform admins read chat categories" ON public.chat_question_categories
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

-- ------------------------------------------------------------- europe pulse
DROP POLICY "Admins manage pulse items" ON public.europe_pulse;
CREATE POLICY "Platform admins manage pulse items" ON public.europe_pulse
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read all pulse items" ON public.europe_pulse;
CREATE POLICY "Platform admins read all pulse items" ON public.europe_pulse
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins manage chapters" ON public.europe_pulse_chapters;
CREATE POLICY "Platform admins manage chapters" ON public.europe_pulse_chapters
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read all chapters" ON public.europe_pulse_chapters;
CREATE POLICY "Platform admins read all chapters" ON public.europe_pulse_chapters
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read pulse config" ON public.europe_pulse_config;
CREATE POLICY "Platform admins read pulse config" ON public.europe_pulse_config
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins update pulse config" ON public.europe_pulse_config;
CREATE POLICY "Platform admins update pulse config" ON public.europe_pulse_config
  FOR UPDATE TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read raw scans" ON public.europe_pulse_raw;
CREATE POLICY "Platform admins read raw scans" ON public.europe_pulse_raw
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins read runs" ON public.europe_pulse_runs;
CREATE POLICY "Platform admins read runs" ON public.europe_pulse_runs
  FOR SELECT TO authenticated
  USING (private.is_platform_admin(auth.uid()));

-- ------------------------------------------------- operational structure
DROP POLICY "Admins manage projects" ON public.op_projects;
CREATE POLICY "Platform admins manage projects" ON public.op_projects
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins manage assignments" ON public.op_assignments;
CREATE POLICY "Platform admins manage assignments" ON public.op_assignments
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins manage project regions" ON public.op_project_regions;
CREATE POLICY "Platform admins manage project regions" ON public.op_project_regions
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Admins manage project roles" ON public.op_project_roles;
CREATE POLICY "Platform admins manage project roles" ON public.op_project_roles
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

-- ------------------------------------------------------------- live chat
DROP POLICY "Admins manage shifts" ON public.live_chat_shifts;
CREATE POLICY "Platform admins manage shifts" ON public.live_chat_shifts
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

DROP POLICY "Volunteers see waiting and their own conversations" ON public.live_chat_conversations;
CREATE POLICY "Volunteers see waiting and their own conversations" ON public.live_chat_conversations
  FOR SELECT TO authenticated
  USING (
    private.is_platform_admin(auth.uid())
    OR volunteer_user_id = auth.uid()
    OR (status = 'waiting' AND private.has_role(auth.uid(), 'member'))
  );

DROP POLICY "Read messages of readable conversations" ON public.live_chat_messages;
CREATE POLICY "Read messages of readable conversations" ON public.live_chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.live_chat_conversations c
     WHERE c.id = live_chat_messages.conversation_id
       AND (private.is_platform_admin(auth.uid()) OR c.volunteer_user_id = auth.uid())
  ));

DROP POLICY "Volunteers and staff see who is online" ON public.live_chat_presence;
CREATE POLICY "Volunteers and staff see who is online" ON public.live_chat_presence
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'member')
    OR private.is_platform_admin(auth.uid())
    OR private.has_role(auth.uid(), 'editor')
  );

-- ------------------------------------------------------------- governance
-- Governance leaves the editorial scope: it is an Administrator area now.
DROP POLICY "governance editors write" ON public.governance_documents;
CREATE POLICY "governance platform admins write" ON public.governance_documents
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

-- --------------------------------------------- coach finder configuration
DROP POLICY "coach_finder_config editors write" ON public.coach_finder_config;
CREATE POLICY "coach_finder_config platform admins write" ON public.coach_finder_config
  FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid()))
  WITH CHECK (private.is_platform_admin(auth.uid()));

-- ------------------------------------------------------------ vocabularies
DO $do$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cf_availability_labels','cf_client_types','cf_credentials','cf_event_categories',
    'cf_experience_bands','cf_formats','cf_languages','cf_regions','cf_specialisations'
  ] LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', tbl || ' editors write', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()))',
      tbl || ' platform admins write', tbl);
    EXECUTE format('DROP POLICY %I ON public.%I', tbl || ' authenticated read', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (is_active OR private.is_platform_admin(auth.uid()))',
      tbl || ' authenticated read', tbl);
  END LOOP;
END
$do$;