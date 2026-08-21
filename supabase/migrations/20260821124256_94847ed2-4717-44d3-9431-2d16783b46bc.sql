-- Deck download leads: the public writes a lead, nothing more.
-- The insert policy already constrains the values; this constrains the columns,
-- so a caller can never supply its own id or created_at.
REVOKE INSERT ON public.deck_download_leads FROM anon, authenticated;
GRANT INSERT (email, locale, consent, source) ON public.deck_download_leads TO anon, authenticated;
-- Reads stay editor-only through the existing row policy.
GRANT ALL ON public.deck_download_leads TO service_role;