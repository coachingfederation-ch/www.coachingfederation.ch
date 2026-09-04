ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS correspondence_locale text
  CHECK (correspondence_locale IN ('en','de','fr','it'));

COMMENT ON COLUMN public.members.correspondence_locale IS 'Member-chosen language for chapter correspondence (email). NULL = no preference.';