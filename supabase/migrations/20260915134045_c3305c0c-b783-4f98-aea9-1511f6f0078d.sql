-- 1. article_feedback: all inserts go through the server (service role) already.
DROP POLICY IF EXISTS "Anyone may submit article feedback" ON public.article_feedback;
REVOKE ALL ON public.article_feedback FROM anon;
REVOKE ALL ON public.article_feedback FROM authenticated;
GRANT ALL ON public.article_feedback TO service_role;

-- 2. categories: public read limited to categories used by a published article.
DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories read published or staff"
ON public.categories FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.category_id = categories.id AND a.status = 'published'::article_status
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- 3. coach_finder_config: bind the read to the singleton settings row.
DROP POLICY IF EXISTS "coach_finder_config public read" ON public.coach_finder_config;
CREATE POLICY "coach_finder_config read settings row"
ON public.coach_finder_config FOR SELECT
TO anon, authenticated
USING (id = true);

-- 4. storage: article images are served via server-minted signed URLs only.
DROP POLICY IF EXISTS "Article images readable when published" ON storage.objects;