-- Add image_url column to grievances table
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for grievance photos (public read, auth write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('grievance-photos', 'grievance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY IF NOT EXISTS "auth_upload_grievance_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'grievance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to all photos
CREATE POLICY IF NOT EXISTS "public_read_grievance_photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'grievance-photos');

-- Allow users to delete their own photos
CREATE POLICY IF NOT EXISTS "auth_delete_grievance_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'grievance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
