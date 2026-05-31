-- Prelaunch hardening, part 3:
-- split public course policies so anon reads do not execute membership helpers.

DROP POLICY IF EXISTS "Courses SELECT" ON public.courses;
DROP POLICY IF EXISTS "Courses INSERT" ON public.courses;
DROP POLICY IF EXISTS "Courses UPDATE" ON public.courses;
DROP POLICY IF EXISTS "Courses DELETE" ON public.courses;

CREATE POLICY courses_select_public
  ON public.courses FOR SELECT TO anon
  USING (status <> 'draft'::public.course_status);

CREATE POLICY courses_select_authenticated
  ON public.courses FOR SELECT TO authenticated
  USING (
    status <> 'draft'::public.course_status
    OR public.is_seller_member(seller_id, (SELECT auth.uid()))
  );

CREATE POLICY courses_insert_member
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

CREATE POLICY courses_update_member
  ON public.courses FOR UPDATE TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

CREATE POLICY courses_delete_member
  ON public.courses FOR DELETE TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "course_sessions SELECT" ON public.course_sessions;
DROP POLICY IF EXISTS "course_sessions INSERT" ON public.course_sessions;
DROP POLICY IF EXISTS "course_sessions UPDATE" ON public.course_sessions;
DROP POLICY IF EXISTS "course_sessions DELETE" ON public.course_sessions;

CREATE POLICY course_sessions_select_public
  ON public.course_sessions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND c.status = ANY (ARRAY[
          'active'::public.course_status,
          'upcoming'::public.course_status,
          'cancelled'::public.course_status
        ])
    )
  );

CREATE POLICY course_sessions_select_authenticated
  ON public.course_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND (
          c.status = ANY (ARRAY[
            'active'::public.course_status,
            'upcoming'::public.course_status,
            'cancelled'::public.course_status
          ])
          OR public.is_seller_member(c.seller_id, (SELECT auth.uid()))
        )
    )
  );

CREATE POLICY course_sessions_insert_member
  ON public.course_sessions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY course_sessions_update_member
  ON public.course_sessions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY course_sessions_delete_member
  ON public.course_sessions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "course_signup_packages SELECT" ON public.course_signup_packages;
DROP POLICY IF EXISTS "course_signup_packages INSERT" ON public.course_signup_packages;
DROP POLICY IF EXISTS "course_signup_packages UPDATE" ON public.course_signup_packages;
DROP POLICY IF EXISTS "course_signup_packages DELETE" ON public.course_signup_packages;

CREATE POLICY course_signup_packages_select_public
  ON public.course_signup_packages FOR SELECT TO anon
  USING (
    is_active = true
    AND (sales_starts_at IS NULL OR sales_starts_at <= now())
    AND (sales_ends_at IS NULL OR sales_ends_at > now())
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND c.status <> 'draft'::public.course_status
    )
  );

CREATE POLICY course_signup_packages_select_authenticated
  ON public.course_signup_packages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
    OR (
      is_active = true
      AND (sales_starts_at IS NULL OR sales_starts_at <= now())
      AND (sales_ends_at IS NULL OR sales_ends_at > now())
      AND EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_signup_packages.course_id
          AND c.status <> 'draft'::public.course_status
      )
    )
  );

CREATE POLICY course_signup_packages_insert_member
  ON public.course_signup_packages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY course_signup_packages_update_member
  ON public.course_signup_packages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY course_signup_packages_delete_member
  ON public.course_signup_packages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_seller_member(c.seller_id, (SELECT auth.uid()))
    )
  );
