CREATE OR REPLACE FUNCTION private.is_event_viewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  select private.has_role(_user_id, 'organizer_readonly')
$function$;
REVOKE ALL ON FUNCTION private.is_event_viewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_event_viewer(uuid) TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events','event_translations','event_ticket_tiers','event_hosts','event_speakers','event_speaker_links',
    'event_invitations','event_waitlist_entries','event_discount_codes','event_forms','event_form_questions',
    'event_form_recipients','event_form_responses','event_attendance_imports','event_attendance_import_rows',
    'event_attendance_sessions','event_cce_applications','event_cce_awards','event_cce_schedule_rows',
    'event_certificates','event_recaps','event_recap_translations','event_recap_photos','event_recap_files',
    'form_templates'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "organizer read-only views all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "organizer read-only views all" ON public.%I FOR SELECT TO authenticated USING (private.is_event_viewer(auth.uid()))', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  select private.has_role(_user_id, 'admin')
      or private.has_role(_user_id, 'editor')
      or private.has_role(_user_id, 'organizer')
      or private.has_role(_user_id, 'publisher')
      or private.has_role(_user_id, 'organizer_readonly')
$function$;

DROP POLICY IF EXISTS "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND (((role = ANY (ARRAY['administrator','editor','organizer','organizer_readonly','publisher','membership']::app_role[])) AND (private.has_role(user_id, 'member'::app_role) OR private.is_internal_account(user_id))) OR (role = 'admin'::app_role)));

DROP POLICY IF EXISTS "admins revoke managed roles" ON public.user_roles;
CREATE POLICY "admins revoke managed roles" ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) AND (role = ANY (ARRAY['administrator','editor','organizer','organizer_readonly','publisher','membership','admin']::app_role[])));