-- Guest registrations stay insert-only for anonymous visitors.
-- Even if a broadening read policy were ever added, the missing SELECT
-- privilege keeps attendee names and emails unreadable for `anon`.
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.event_registrations FROM anon;

-- The guest write path only ever sets these columns (see submitRegistration).
-- Re-granting them explicitly documents the allowed surface and is idempotent.
GRANT INSERT (
  id, event_id, user_id, email, full_name, notes, locale,
  tier_id, discount_code_id, payment_status, hold_expires_at, answers
) ON public.event_registrations TO anon;