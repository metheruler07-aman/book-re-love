
CREATE POLICY "Anyone can read book photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'book-photos');
CREATE POLICY "Auth can upload book photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner can delete own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);
