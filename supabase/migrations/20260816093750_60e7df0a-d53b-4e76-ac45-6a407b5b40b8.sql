-- 1. Live chat conversations: volunteers never need the visitor's email or the
--    secret key hash in the browser; keep those server-side only.
REVOKE SELECT ON public.live_chat_conversations FROM authenticated;
GRANT SELECT (
  id, visitor_name, locale, page_path, status, volunteer_user_id, volunteer_name,
  accepted_at, ended_at, last_message_at, created_at, updated_at
) ON public.live_chat_conversations TO authenticated;

-- 2. Volunteer presence: only volunteers (members) and staff need the roster.
DROP POLICY IF EXISTS "Signed-in people see who is online" ON public.live_chat_presence;
CREATE POLICY "Volunteers and staff see who is online"
  ON public.live_chat_presence
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'member'::app_role)
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'editor'::app_role)
  );