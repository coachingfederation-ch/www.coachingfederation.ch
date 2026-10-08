-- Gatekeeper for the event-reminders cron: true only when at least one
-- reminder stage has an open send window with an unsent, eligible seat.
-- Mirrors src/lib/event-reminder-timing.ts; the app still re-checks everything.
CREATE OR REPLACE FUNCTION public.event_reminders_due()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ev AS (
    SELECT e.id, e.starts_at,
      CASE
        WHEN ((e.starts_at - interval '24 hours') AT TIME ZONE 'Europe/Zurich')::time
             BETWEEN time '08:00' AND time '21:00'
          THEN e.starts_at - interval '24 hours'
        ELSE ((((e.starts_at AT TIME ZONE 'Europe/Zurich')::date - 1) + time '21:00')
              AT TIME ZONE 'Europe/Zurich')
      END AS due_day,
      e.starts_at - interval '2 hours' AS due_2h,
      e.starts_at - interval '15 minutes' AS due_15m
    FROM public.events e
    WHERE e.status = 'published'
      AND e.registration_mode <> 'none'
      AND e.starts_at > now()
      AND e.starts_at <= now() + interval '36 hours'
  )
  SELECT EXISTS (
    SELECT 1
    FROM ev
    JOIN public.event_registrations r ON r.event_id = ev.id
    WHERE r.status = 'confirmed'
      AND r.payment_status IN ('not_required', 'paid')
      AND (
        (now() >= ev.due_day AND now() < ev.due_2h
          AND r.created_at < ev.due_day AND r.reminder_1d_sent_at IS NULL)
        OR (now() >= ev.due_2h AND now() < ev.due_15m
          AND r.created_at < ev.due_2h AND r.reminder_2h_sent_at IS NULL)
        OR (now() >= ev.due_15m AND now() < ev.starts_at
          AND r.created_at < ev.due_15m AND r.reminder_15m_sent_at IS NULL)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.event_reminders_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_reminders_due() TO service_role;