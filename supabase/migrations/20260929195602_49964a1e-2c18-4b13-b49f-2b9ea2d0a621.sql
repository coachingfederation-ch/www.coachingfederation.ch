ALTER TABLE public.event_speakers
  ADD COLUMN profile_id uuid REFERENCES public.member_directory_profiles(id) ON DELETE SET NULL;

-- One library entry per member, so a member speaker is reused, never duplicated.
CREATE UNIQUE INDEX event_speakers_profile_id_key
  ON public.event_speakers (profile_id) WHERE profile_id IS NOT NULL;