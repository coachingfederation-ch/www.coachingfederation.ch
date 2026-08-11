ALTER VIEW public.event_ticket_tiers_public SET (security_invoker = on);
ALTER VIEW public.event_registration_fields_public SET (security_invoker = on);

GRANT SELECT (id, event_id, name, name_de, name_fr, name_it, description, description_de,
  description_fr, description_it, price_cents, currency, capacity, segment, sort_order, is_active)
  ON public.event_ticket_tiers TO anon;
GRANT SELECT (id, event_id, field_key, label, label_de, label_fr, label_it, field_type,
  options, is_required, sort_order, is_active)
  ON public.event_registration_fields TO anon;

CREATE POLICY "public reads active tiers on published events" ON public.event_ticket_tiers
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published')
  );

CREATE POLICY "public reads active fields on published events" ON public.event_registration_fields
  FOR SELECT TO anon, authenticated
  USING (
    is_active
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published')
  );