CREATE POLICY "Editors manage newsletter block images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'article-images'
  AND (storage.foldername(name))[1] = 'newsletters'
  AND (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
)
WITH CHECK (
  bucket_id = 'article-images'
  AND (storage.foldername(name))[1] = 'newsletters'
  AND (private.is_editor(auth.uid()) OR private.is_article_publisher(auth.uid()))
);