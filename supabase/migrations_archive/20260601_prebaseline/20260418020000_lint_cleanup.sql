-- ============================================
-- MIGRATION: Advisor lint cleanup
--
-- 1. Merge the two signups UPDATE policies into one
--    (multiple_permissive_policies advisor).
-- 2. Drop the broad "Public can view course images" SELECT policy on
--    storage.objects. The bucket is public, so object URLs resolve
--    without this policy; it only enabled anonymous listing.
-- ============================================


-- ============================================
-- 1. Consolidate signups UPDATE policies
--    Semantics preserved:
--      - org members may update anything
--      - the row's user may update only to set status = 'cancelled'
-- ============================================
DROP POLICY IF EXISTS "Signups UPDATE by user (cancel only)" ON public.signups;
DROP POLICY IF EXISTS "Signups UPDATE by org member" ON public.signups;

CREATE POLICY "Signups UPDATE"
  ON public.signups FOR UPDATE TO authenticated
  USING (
    public.is_org_member(organization_id, (SELECT auth.uid()))
    OR user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_org_member(organization_id, (SELECT auth.uid()))
    OR (
      user_id = (SELECT auth.uid())
      AND status = 'cancelled'::signup_status
    )
  );


-- ============================================
-- 2. Drop redundant public SELECT on course-images
-- ============================================
DROP POLICY IF EXISTS "Public can view course images" ON storage.objects;
