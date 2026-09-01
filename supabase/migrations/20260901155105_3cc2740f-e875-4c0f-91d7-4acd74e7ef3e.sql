CREATE POLICY "Admins manage community cover images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'article-images'
  AND (storage.foldername(name))[1] = 'communities'
  AND private.is_platform_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'article-images'
  AND (storage.foldername(name))[1] = 'communities'
  AND private.is_platform_admin(auth.uid())
);