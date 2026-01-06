-- ============================================
-- FIX COURSE IMAGES STORAGE SECURITY
-- Restricts upload/update/delete to organization members only
-- ============================================

-- Drop the insecure policies
DROP POLICY IF EXISTS "Authenticated users can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete course images" ON storage.objects;

-- ============================================
-- SECURE POLICIES - Organization Members Only
-- ============================================

-- Storage path format: courses/{organization_id}/{course_id}/{filename}
-- Extract organization_id from path and verify user is a member

-- Only organization members can upload course images
CREATE POLICY "Organization members can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id::text = split_part(name, '/', 2)
  )
);

-- Only organization members can update their course images
CREATE POLICY "Organization members can update course images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id::text = split_part(name, '/', 2)
  )
);

-- Only organization members can delete their course images
CREATE POLICY "Organization members can delete course images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id::text = split_part(name, '/', 2)
  )
);

-- ============================================
-- NOTES
-- ============================================
-- File path structure must be: courses/{organization_id}/{course_id}/{filename}
-- This ensures the organization_id in the path matches the user's membership
-- Public viewing policy remains unchanged (anyone can view images)
