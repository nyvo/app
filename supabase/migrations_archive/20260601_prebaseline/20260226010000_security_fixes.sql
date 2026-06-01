-- Migration: Security fixes from audit
-- Fixes: delete_course_cascade authorization, signups INSERT policy,
--        guest booking linkage RPC, webhook events RLS

-- ============================================
-- 1. Fix delete_course_cascade: add authorization check
--    Previously any authenticated user could delete any course.
-- ============================================
CREATE OR REPLACE FUNCTION delete_course_cascade(p_course_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is an org member of the course's organization
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN org_members om ON om.organization_id = c.organization_id
    WHERE c.id = p_course_id AND om.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you are not a member of this course''s organization';
  END IF;

  -- Delete in foreign key order within a single transaction
  DELETE FROM signups WHERE course_id = p_course_id;
  DELETE FROM course_sessions WHERE course_id = p_course_id;
  DELETE FROM courses WHERE id = p_course_id;
END;
$$;

-- ============================================
-- 2. Tighten signups INSERT policy
--    Previously WITH CHECK (TRUE) allowed user_id spoofing.
--    Now: guest checkout (user_id IS NULL) still works,
--    but authenticated users can only set their own user_id.
-- ============================================
DROP POLICY IF EXISTS "Anyone can create signups" ON signups;

CREATE POLICY "Anyone can create signups"
  ON signups FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ============================================
-- 3. Add link_guest_bookings RPC
--    Replaces client-side linkGuestBookingsToUser() which accepted
--    arbitrary userId and email parameters from the client.
--    This RPC uses auth.uid() and looks up the email server-side.
-- ============================================
CREATE OR REPLACE FUNCTION link_guest_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  linked_count integer;
BEGIN
  -- Look up the authenticated user's email server-side
  SELECT email INTO caller_email
  FROM auth.users
  WHERE id = auth.uid();

  IF caller_email IS NULL THEN
    RETURN 0;
  END IF;

  -- Link guest bookings (no user_id) that match this email
  UPDATE signups
  SET user_id = auth.uid()
  WHERE participant_email = caller_email
    AND user_id IS NULL;

  GET DIAGNOSTICS linked_count = ROW_COUNT;
  RETURN linked_count;
END;
$$;

-- ============================================
-- 4. Explicit RLS policy on processed_webhook_events
--    Table had RLS enabled but no policies, relying on
--    implicit service_role bypass. Make it explicit.
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'processed_webhook_events'
    AND policyname = 'Service role only'
  ) THEN
    CREATE POLICY "Service role only"
      ON processed_webhook_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
