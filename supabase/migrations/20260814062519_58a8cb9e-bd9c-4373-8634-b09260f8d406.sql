-- Guest registration contact details: no anonymous read path whatsoever.
-- (Anon keeps only the INSERT column grants needed for guest sign-up.)
REVOKE SELECT ON public.event_registrations FROM anon;
REVOKE SELECT (email, full_name, notes, answers, locale, user_id, event_id, tier_id, id, payment_status, hold_expires_at, discount_code_id)
  ON public.event_registrations FROM anon;

-- Internal project contact email is admin-only; the public address stays readable.
REVOKE SELECT (contact_email) ON public.op_projects FROM anon, authenticated;