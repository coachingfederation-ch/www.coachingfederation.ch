GRANT EXECUTE ON FUNCTION public.issue_event_completion(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_event_certificate(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reissue_event_certificate(uuid, uuid) TO authenticated;