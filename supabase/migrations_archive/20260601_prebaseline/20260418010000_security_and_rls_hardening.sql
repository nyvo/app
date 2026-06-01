-- ============================================
-- MIGRATION: Security and RLS hardening
--
-- 1. Close signup PII leak (`Anyone can read signup by checkout session`)
--    by moving checkout-success lookups to a SECURITY DEFINER RPC.
-- 2. Lock search_path on all public functions (fixes function_search_path_mutable).
-- 3. Rewrite RLS policies to use (SELECT auth.uid()) and consolidate
--    overlapping permissive policies (fixes auth_rls_initplan and
--    multiple_permissive_policies).
-- 4. Enforce NOT NULL on required signup PII columns.
-- 5. Index hygiene: drop duplicate unique constraint, add missing FK indexes.
-- ============================================


-- ============================================
-- 1. Checkout-success signup lookup RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.get_signup_by_stripe_id(
  p_session_id text DEFAULT NULL,
  p_payment_intent_id text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result json;
BEGIN
  IF p_session_id IS NULL AND p_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'Must supply either p_session_id or p_payment_intent_id';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'participant_name', s.participant_name,
    'participant_email', s.participant_email,
    'amount_paid', s.amount_paid,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'organization', json_build_object('slug', o.slug, 'name', o.name)
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE (p_session_id IS NOT NULL AND s.stripe_checkout_session_id = p_session_id)
     OR (p_payment_intent_id IS NOT NULL AND s.stripe_payment_intent_id = p_payment_intent_id)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_stripe_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_stripe_id(text, text) TO anon, authenticated;

-- Remove the broad policy that leaked all paid signups
DROP POLICY IF EXISTS "Anyone can read signup by checkout session" ON public.signups;


-- ============================================
-- 2. Lock search_path on all public functions
--    Prevents search_path-based shimming against SECURITY DEFINER functions.
-- ============================================
ALTER FUNCTION public.calculate_package_end_date(date, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_low_enrollment_notifications() SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_session_conflict(uuid, date, time, time, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.check_sessions_conflicts(uuid, jsonb, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.claim_waitlist_spot(uuid, text, text, numeric) SET search_path = pg_catalog, public;
ALTER FUNCTION public.cleanup_old_webhook_events() SET search_path = pg_catalog, public;
ALTER FUNCTION public.count_active_confirmed_signups(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_course_idempotent(uuid, text, text, text, text, text, text, text, text, integer, integer, numeric, boolean, numeric, integer, date, date, uuid, text, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_signup_if_available(uuid, uuid, text, text, text, text, text, text, numeric, boolean, date, time, uuid, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.delete_course_cascade(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_session_no_conflict() SET search_path = pg_catalog, public;
ALTER FUNCTION public.ensure_organization_for_user(text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_active_notifications(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_org_member(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_org_owner(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_platform_admin(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.process_expired_waitlist_offers(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.promote_next_waitlist_entry(uuid, integer) SET search_path = pg_catalog, public;
ALTER FUNCTION public.resolve_notification(uuid, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_message_notification() SET search_path = pg_catalog, public;
ALTER FUNCTION public.trg_signup_notification() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_course_sessions_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.upsert_notification(uuid, text, text, text, text, text, text) SET search_path = pg_catalog, public;


-- ============================================
-- 3. RLS policy rewrites
--    - Wrap auth.uid() in (SELECT ...) so it initplans once per query.
--    - Consolidate overlapping permissive policies on hot tables.
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles SELECT"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.is_platform_admin((SELECT auth.uid()))
  );

CREATE POLICY "Profiles INSERT own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Profiles UPDATE own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));


-- ORG_MEMBERS
DROP POLICY IF EXISTS "Users can read own memberships" ON public.org_members;
DROP POLICY IF EXISTS "Org members can read org memberships" ON public.org_members;
DROP POLICY IF EXISTS "Owners can insert members" ON public.org_members;
DROP POLICY IF EXISTS "Owners can update members" ON public.org_members;
DROP POLICY IF EXISTS "Owners can delete members" ON public.org_members;

CREATE POLICY "Org members SELECT"
  ON public.org_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_org_member(organization_id, (SELECT auth.uid()))
  );

CREATE POLICY "Org members INSERT"
  ON public.org_members FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner(organization_id, (SELECT auth.uid())));

CREATE POLICY "Org members UPDATE"
  ON public.org_members FOR UPDATE TO authenticated
  USING (public.is_org_owner(organization_id, (SELECT auth.uid())));

CREATE POLICY "Org members DELETE"
  ON public.org_members FOR DELETE TO authenticated
  USING (
    public.is_org_owner(organization_id, (SELECT auth.uid()))
    AND user_id <> (SELECT auth.uid())
  );


-- ORGANIZATIONS
-- Note: the "Public can read organizations" policy is intentionally
-- untouched here because narrowing it requires app-side changes
-- (stripe_account_id and other sensitive fields are returned by
-- fetchOrganizationBySlug via `select *`). Track separately.
DROP POLICY IF EXISTS "Org admins can update organization" ON public.organizations;
CREATE POLICY "Org admins can update organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_owner(id, (SELECT auth.uid())));


-- COURSES
DROP POLICY IF EXISTS "Public can read published courses" ON public.courses;
DROP POLICY IF EXISTS "Org members can read all org courses" ON public.courses;
DROP POLICY IF EXISTS "Org members can create courses" ON public.courses;
DROP POLICY IF EXISTS "Org members can update courses" ON public.courses;
DROP POLICY IF EXISTS "Org members can delete courses" ON public.courses;

CREATE POLICY "Courses SELECT"
  ON public.courses FOR SELECT TO authenticated, anon
  USING (
    status <> 'draft'::course_status
    OR public.is_org_member(organization_id, (SELECT auth.uid()))
  );

CREATE POLICY "Courses INSERT"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Courses UPDATE"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Courses DELETE"
  ON public.courses FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));


-- COURSE_SESSIONS
DROP POLICY IF EXISTS "Org members can read course sessions" ON public.course_sessions;
DROP POLICY IF EXISTS "Teachers can insert course sessions" ON public.course_sessions;
DROP POLICY IF EXISTS "Teachers can update course sessions" ON public.course_sessions;
DROP POLICY IF EXISTS "Teachers can delete course sessions" ON public.course_sessions;

CREATE POLICY "Course sessions SELECT"
  ON public.course_sessions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_sessions.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Course sessions INSERT"
  ON public.course_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_sessions.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Course sessions UPDATE"
  ON public.course_sessions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_sessions.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Course sessions DELETE"
  ON public.course_sessions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_sessions.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));


-- COURSE_SIGNUP_PACKAGES
DROP POLICY IF EXISTS "Public can read signup packages" ON public.course_signup_packages;
DROP POLICY IF EXISTS "Org members can manage signup packages" ON public.course_signup_packages;

CREATE POLICY "Signup packages SELECT"
  ON public.course_signup_packages FOR SELECT TO authenticated, anon
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_signup_packages.course_id
      AND (
        c.status <> 'draft'::course_status
        OR public.is_org_member(c.organization_id, (SELECT auth.uid()))
      )
  ));

CREATE POLICY "Signup packages INSERT"
  ON public.course_signup_packages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_signup_packages.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Signup packages UPDATE"
  ON public.course_signup_packages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_signup_packages.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Signup packages DELETE"
  ON public.course_signup_packages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_signup_packages.course_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));


-- SIGNUPS
DROP POLICY IF EXISTS "Anyone can create signups" ON public.signups;
DROP POLICY IF EXISTS "Users can read own signups" ON public.signups;
DROP POLICY IF EXISTS "Org members can read org signups" ON public.signups;
DROP POLICY IF EXISTS "Users can cancel own signups" ON public.signups;
DROP POLICY IF EXISTS "Org members can update signups" ON public.signups;

CREATE POLICY "Signups INSERT"
  ON public.signups FOR INSERT TO authenticated, anon
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY "Signups SELECT"
  ON public.signups FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_org_member(organization_id, (SELECT auth.uid()))
  );

-- Two UPDATE policies kept distinct: user may only cancel;
-- org members may do anything (e.g. refund bookkeeping).
CREATE POLICY "Signups UPDATE by user (cancel only)"
  ON public.signups FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (status = 'cancelled'::signup_status);

CREATE POLICY "Signups UPDATE by org member"
  ON public.signups FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));


-- CONVERSATIONS
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Org members can read org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Org members can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Org members can update org conversations" ON public.conversations;
DROP POLICY IF EXISTS "Org members can delete org conversations" ON public.conversations;

CREATE POLICY "Conversations SELECT"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_org_member(organization_id, (SELECT auth.uid()))
  );

CREATE POLICY "Conversations INSERT"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Conversations UPDATE"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())))
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Conversations DELETE"
  ON public.conversations FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));


-- MESSAGES
DROP POLICY IF EXISTS "Users can read messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Org members can read org messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Org members can create messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can update org messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can delete org messages" ON public.messages;

CREATE POLICY "Messages SELECT"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (
        c.user_id = (SELECT auth.uid())
        OR public.is_org_member(c.organization_id, (SELECT auth.uid()))
      )
  ));

CREATE POLICY "Messages INSERT"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (
        c.user_id = (SELECT auth.uid())
        OR public.is_org_member(c.organization_id, (SELECT auth.uid()))
      )
  ));

CREATE POLICY "Messages UPDATE"
  ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));

CREATE POLICY "Messages DELETE"
  ON public.messages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
  ));


-- NOTIFICATIONS
DROP POLICY IF EXISTS "Org members can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Org members can dismiss notifications" ON public.notifications;

CREATE POLICY "Notifications SELECT"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Notifications UPDATE"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())))
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));


-- NOTIFICATION_READS
DROP POLICY IF EXISTS "Users can read own notification_reads" ON public.notification_reads;
DROP POLICY IF EXISTS "Users can insert own notification_reads" ON public.notification_reads;
DROP POLICY IF EXISTS "Users can delete own notification_reads" ON public.notification_reads;

CREATE POLICY "Notification reads SELECT"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Notification reads INSERT"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Notification reads DELETE"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- TEACHER_LOCATIONS
DROP POLICY IF EXISTS "Users can manage their org locations" ON public.teacher_locations;

CREATE POLICY "Teacher locations ALL"
  ON public.teacher_locations FOR ALL TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())))
  WITH CHECK (public.is_org_member(organization_id, (SELECT auth.uid())));


-- ============================================
-- 4. Enforce NOT NULL on required signup PII columns
--    Verified pre-migration: zero rows with NULL in these columns.
-- ============================================
ALTER TABLE public.signups
  ALTER COLUMN participant_name SET NOT NULL,
  ALTER COLUMN participant_email SET NOT NULL;


-- ============================================
-- 5. Index hygiene
-- ============================================
-- processed_webhook_events has both a PRIMARY KEY and a redundant UNIQUE
-- constraint on event_id. Keep the primary key.
ALTER TABLE public.processed_webhook_events
  DROP CONSTRAINT IF EXISTS processed_webhook_events_event_id_key;

-- Missing indexes on foreign keys (flagged by performance advisor).
CREATE INDEX IF NOT EXISTS idx_courses_instructor
  ON public.courses(instructor_id)
  WHERE instructor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signups_signup_package
  ON public.signups(signup_package_id)
  WHERE signup_package_id IS NOT NULL;
