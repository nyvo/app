-- Stop anon/authenticated from LISTING every object in the public storefront
-- buckets. (Supabase advisor 0025_public_bucket_allows_listing.)
--
-- course-images and seller-logos are PUBLIC buckets: object bytes are served over
-- the public path (/storage/v1/object/public/...), which does NOT consult an RLS
-- SELECT policy. Every read in the app goes through getPublicUrl, so these broad
-- `bucket_id = '…'` SELECT policies add no read capability — they only let a
-- client enumerate the full object list of the bucket. Drop them.
--
-- Unaffected:
--   * Public URL reads (getPublicUrl) — served without RLS on a public bucket.
--   * Uploads — the `*_write` policies (cmd ALL, gated by storage_can_write_*) stay.
--   * Owner deletes (.remove()) — also covered by the `*_write` ALL policy for the
--     objects a user can write; service-role deletes bypass RLS entirely.
DROP POLICY IF EXISTS course_images_read ON storage.objects;
DROP POLICY IF EXISTS seller_logos_read ON storage.objects;
