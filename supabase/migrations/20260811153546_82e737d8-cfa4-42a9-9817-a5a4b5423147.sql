-- Narrow authenticated read access on event_registrations to the columns the
-- app actually renders; payment session identifiers stay server-only.
REVOKE SELECT ON public.event_registrations FROM authenticated;

GRANT SELECT (
  id, event_id, user_id, email, full_name, status, notes,
  created_at, updated_at, tier_id, payment_status,
  amount_cents, currency, hold_expires_at, answers
) ON public.event_registrations TO authenticated;