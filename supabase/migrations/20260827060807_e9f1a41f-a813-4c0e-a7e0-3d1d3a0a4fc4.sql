REVOKE ALL ON public.live_chat_conversations FROM anon;
REVOKE ALL ON public.live_chat_conversations FROM authenticated;
GRANT UPDATE ON public.live_chat_conversations TO authenticated;
GRANT SELECT (id, status, locale, page_path, visitor_name, volunteer_user_id, volunteer_name, accepted_at, ended_at, created_at, updated_at, last_message_at) ON public.live_chat_conversations TO authenticated;
GRANT ALL ON public.live_chat_conversations TO service_role;