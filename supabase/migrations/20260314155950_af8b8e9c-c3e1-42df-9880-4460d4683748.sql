
-- Fix product-images upload policy to scope to user's folder
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add file size limits and mime type restrictions
UPDATE storage.buckets 
SET file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name IN ('product-images', 'avatars');
