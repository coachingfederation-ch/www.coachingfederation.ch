DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'event_forms','event_form_questions','event_form_recipients','event_form_responses','form_templates'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "organizer read-only views all" ON public.%I', t);
  END LOOP;
END $$;