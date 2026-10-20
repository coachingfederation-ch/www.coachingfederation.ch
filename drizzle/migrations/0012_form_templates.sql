CREATE TABLE public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'registration' CHECK (kind IN ('registration','follow_up')),
  name text NOT NULL,
  intro text,
  thank_you text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_templates TO authenticated;
GRANT ALL ON public.form_templates TO service_role;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event staff manage form templates" ON public.form_templates
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'))
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'editor') OR private.has_role(auth.uid(),'organizer'));
CREATE TRIGGER form_templates_touch BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
ALTER TABLE public.event_forms ADD COLUMN template_id uuid REFERENCES public.form_templates(id) ON DELETE SET NULL;