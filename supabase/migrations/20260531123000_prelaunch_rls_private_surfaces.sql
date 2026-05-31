-- Prelaunch hardening, part 4:
-- keep private/mutating policies authenticated-only and remove anon helper paths.

DROP POLICY IF EXISTS "Sellers UPDATE by owner" ON public.sellers;
CREATE POLICY sellers_update_owner
  ON public.sellers FOR UPDATE TO authenticated
  USING (public.is_seller_owner(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "seller_members SELECT" ON public.seller_members;
DROP POLICY IF EXISTS "seller_members INSERT" ON public.seller_members;
DROP POLICY IF EXISTS "seller_members UPDATE" ON public.seller_members;
DROP POLICY IF EXISTS "seller_members DELETE" ON public.seller_members;

CREATE POLICY seller_members_select_member
  ON public.seller_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_seller_member(seller_id, (SELECT auth.uid()))
  );

CREATE POLICY seller_members_insert_owner
  ON public.seller_members FOR INSERT TO authenticated
  WITH CHECK (public.is_seller_owner(seller_id, (SELECT auth.uid())));

CREATE POLICY seller_members_update_owner
  ON public.seller_members FOR UPDATE TO authenticated
  USING (public.is_seller_owner(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_owner(seller_id, (SELECT auth.uid())));

CREATE POLICY seller_members_delete_owner
  ON public.seller_members FOR DELETE TO authenticated
  USING (
    public.is_seller_owner(seller_id, (SELECT auth.uid()))
    AND user_id <> (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Signups INSERT" ON public.signups;
DROP POLICY IF EXISTS "Signups SELECT" ON public.signups;
DROP POLICY IF EXISTS "Signups UPDATE" ON public.signups;

CREATE POLICY signups_insert_member
  ON public.signups FOR INSERT TO authenticated
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

CREATE POLICY signups_select_member_or_buyer
  ON public.signups FOR SELECT TO authenticated
  USING (
    buyer_id = (SELECT auth.uid())
    OR public.is_seller_member(seller_id, (SELECT auth.uid()))
  );

CREATE POLICY signups_update_member_or_buyer_cancel
  ON public.signups FOR UPDATE TO authenticated
  USING (
    public.is_seller_member(seller_id, (SELECT auth.uid()))
    OR buyer_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_seller_member(seller_id, (SELECT auth.uid()))
    OR (
      buyer_id = (SELECT auth.uid())
      AND status = 'cancelled'::public.signup_status
    )
  );

DROP POLICY IF EXISTS "teacher_locations ALL" ON public.teacher_locations;
CREATE POLICY teacher_locations_all_member
  ON public.teacher_locations FOR ALL TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Teams UPDATE by admin" ON public.teams;
DROP POLICY IF EXISTS "Teams DELETE by admin" ON public.teams;

CREATE POLICY teams_update_admin
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_admin(id, (SELECT auth.uid())))
  WITH CHECK (public.is_team_admin(id, (SELECT auth.uid())));

CREATE POLICY teams_delete_admin
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_admin(id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "team_invite_links_admin_write" ON public.team_invite_links;
CREATE POLICY team_invite_links_admin_write
  ON public.team_invite_links FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
      WHERE t.id = team_invite_links.team_id
        AND sm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.teams t
      JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
      WHERE t.id = team_invite_links.team_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "payment_attempts SELECT" ON public.payment_attempts;
CREATE POLICY payment_attempts_select_member
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "payment_audit_log SELECT" ON public.payment_audit_log;
CREATE POLICY payment_audit_log_select_member
  ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS course_team_listings_delete ON public.course_team_listings;
DROP POLICY IF EXISTS course_team_listings_insert ON public.course_team_listings;

CREATE POLICY course_team_listings_insert
  ON public.course_team_listings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_seller_member((
      SELECT c.seller_id
      FROM public.courses c
      WHERE c.id = course_team_listings.course_id
    ), (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.team_affiliations ta
      WHERE ta.team_id = course_team_listings.team_id
        AND ta.seller_id = (
          SELECT c.seller_id
          FROM public.courses c
          WHERE c.id = course_team_listings.course_id
        )
        AND ta.status = 'active'
    )
  );

CREATE POLICY course_team_listings_delete
  ON public.course_team_listings FOR DELETE TO authenticated
  USING (
    public.is_seller_member((
      SELECT c.seller_id
      FROM public.courses c
      WHERE c.id = course_team_listings.course_id
    ), (SELECT auth.uid()))
  );
