CREATE TABLE public.event_speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  url text,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_speakers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_speakers TO authenticated;
GRANT ALL ON public.event_speakers TO service_role;

ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_event_speakers_updated_at
  BEFORE UPDATE ON public.event_speakers
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.event_speaker_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  speaker_id uuid NOT NULL REFERENCES public.event_speakers(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, speaker_id)
);

CREATE INDEX event_speaker_links_event_idx ON public.event_speaker_links (event_id, sort_order);

GRANT SELECT ON public.event_speaker_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_speaker_links TO authenticated;
GRANT ALL ON public.event_speaker_links TO service_role;

ALTER TABLE public.event_speaker_links ENABLE ROW LEVEL SECURITY;

-- Speakers are a chapter-wide library: any staff member who may run events
-- maintains it, mirroring the write side of event_hosts.
CREATE POLICY "editors manage event speakers" ON public.event_speakers
  FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()));

CREATE POLICY "organizers manage event speakers" ON public.event_speakers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'organizer'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'organizer'::app_role));

-- Visitors only ever see a speaker that a visible published event uses.
CREATE POLICY "public read speakers of published events" ON public.event_speakers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_speaker_links l
    JOIN public.events e ON e.id = l.event_id
    WHERE l.speaker_id = event_speakers.id
      AND e.status = 'published'::event_status
      AND (COALESCE(e.is_internal, false) = false OR private.can_view_internal_events(auth.uid()))
  ));

CREATE POLICY "editors manage event speaker links" ON public.event_speaker_links
  FOR ALL TO authenticated
  USING (private.is_editor(auth.uid()))
  WITH CHECK (private.is_editor(auth.uid()));

CREATE POLICY "organizers manage speaker links of own events" ON public.event_speaker_links
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_speaker_links.event_id
      AND e.organizer_id = auth.uid()
      AND private.has_role(auth.uid(), 'organizer'::app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_speaker_links.event_id
      AND e.organizer_id = auth.uid()
      AND private.has_role(auth.uid(), 'organizer'::app_role)
  ));

CREATE POLICY "public read speaker links" ON public.event_speaker_links
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_speaker_links.event_id
      AND e.status = 'published'::event_status
      AND (COALESCE(e.is_internal, false) = false OR private.can_view_internal_events(auth.uid()))
  ));

-- Speaker photos live beside the other CMS pictures, in their own folder.
CREATE POLICY "Event staff manage speaker photos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'article-images'
    AND (storage.foldername(name))[1] = 'speakers'
    AND (private.is_editor(auth.uid()) OR private.has_role(auth.uid(), 'organizer'::app_role))
  )
  WITH CHECK (
    bucket_id = 'article-images'
    AND (storage.foldername(name))[1] = 'speakers'
    AND (private.is_editor(auth.uid()) OR private.has_role(auth.uid(), 'organizer'::app_role))
  );