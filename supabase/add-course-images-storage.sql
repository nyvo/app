-- ============================================
-- COURSE IMAGES STORAGE BUCKET
-- Storage for course images uploaded by teachers
-- ============================================

-- Create storage bucket for course images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-images',
  'course-images',
  TRUE,  -- Publicly accessible for viewing
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================
-- RLS POLICIES FOR COURSE-IMAGES BUCKET
-- ============================================

-- Anyone can view/download images (public bucket)
CREATE POLICY "Public can view course images"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can update/replace their images
CREATE POLICY "Authenticated users can update course images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
);

-- Authenticated users can delete their images
CREATE POLICY "Authenticated users can delete course images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
);
