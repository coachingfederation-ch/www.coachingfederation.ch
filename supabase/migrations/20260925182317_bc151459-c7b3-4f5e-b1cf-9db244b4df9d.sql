CREATE INDEX IF NOT EXISTS events_starts_at_desc_idx ON public.events (starts_at DESC);
CREATE INDEX IF NOT EXISTS event_hosts_profile_id_idx ON public.event_hosts (profile_id);
CREATE INDEX IF NOT EXISTS op_assignments_role_id_idx ON public.op_assignments (role_id);