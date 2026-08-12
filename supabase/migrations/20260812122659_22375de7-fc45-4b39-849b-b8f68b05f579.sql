-- Anonymous guests: narrow the insert grant to the form's own fields.
REVOKE INSERT ON public.event_registrations FROM anon;
GRANT INSERT (
  id, event_id, user_id, email, full_name, notes, locale,
  tier_id, discount_code_id, payment_status, hold_expires_at, answers
) ON public.event_registrations TO anon;

-- Does this event accept a registration with no account behind it?
CREATE OR REPLACE FUNCTION private.event_accepts_guest_registration(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
     WHERE e.id = _event_id
       AND e.status = 'published'
       AND e.registration_mode <> 'none'
       AND (e.registration_mode <> 'rsvp_members' OR e.guest_registration_allowed)
  )
$$;

REVOKE ALL ON FUNCTION private.event_accepts_guest_registration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.event_accepts_guest_registration(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "guests submit registrations" ON public.event_registrations;
CREATE POLICY "guests submit registrations" ON public.event_registrations FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND status = 'confirmed'::event_registration_status
  AND payment_status = ANY (ARRAY['not_required'::event_payment_status, 'pending'::event_payment_status])
  AND private.event_accepts_guest_registration(event_id)
  AND email IS NOT NULL
  AND length(email) BETWEEN 6 AND 254
  AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$'
  AND full_name IS NOT NULL
  AND length(btrim(full_name)) BETWEEN 2 AND 200
  AND (notes IS NULL OR length(notes) <= 2000)
);