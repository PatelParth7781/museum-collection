/*
# MCMS Storage Setup

Creates a public storage bucket for artifact images and exhibition cover images.
Sets up storage policies so:
- Anyone (anon) can READ images — public museum collection
- Authenticated staff (admin/curator) can UPLOAD images
- Authenticated staff can DELETE images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for artifact images
DROP POLICY IF EXISTS "artifact_images_public_read" ON storage.objects;
CREATE POLICY "artifact_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'artifacts');

-- Staff can upload images
DROP POLICY IF EXISTS "artifact_images_staff_upload" ON storage.objects;
CREATE POLICY "artifact_images_staff_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artifacts' AND public.is_staff()
  );

-- Staff can update images
DROP POLICY IF EXISTS "artifact_images_staff_update" ON storage.objects;
CREATE POLICY "artifact_images_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artifacts' AND public.is_staff())
  WITH CHECK (bucket_id = 'artifacts' AND public.is_staff());

-- Staff can delete images
DROP POLICY IF EXISTS "artifact_images_staff_delete" ON storage.objects;
CREATE POLICY "artifact_images_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artifacts' AND public.is_staff());
