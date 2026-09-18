DROP POLICY IF EXISTS "categories read published or staff" ON public.categories;

CREATE POLICY "categories public read used by published"
ON public.categories FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.articles a WHERE a.category_id = categories.id AND a.status = 'published'::article_status));

CREATE POLICY "categories read published or staff"
ON public.categories FOR SELECT TO authenticated
USING (
  private.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.articles a WHERE a.category_id = categories.id AND a.status = 'published'::article_status)
);