-- Area #1 authz hardening (F2) — defense-in-depth.
--
-- The signups UPDATE policy carried a buyer self-cancel branch
-- (buyer_id = auth.uid() AND status = 'cancelled'). RLS can't restrict COLUMNS,
-- only the resulting row, so that branch would have let a buyer PATCH financial
-- fields on their own booking as long as the row ended up cancelled.
--
-- It is NOT currently exploitable: `authenticated` has no table-level UPDATE
-- grant on signups (only INSERT, SELECT), so no signed-in user can UPDATE a
-- signup via PostgREST. All real signup mutations run through service_role
-- (teacher-cancel-signup, finalize-dintero-transaction, dintero-webhook), which
-- bypasses RLS. We remove the buyer branch so that if an UPDATE grant is ever
-- added later, a buyer still cannot tamper with their own booking — a buyer
-- self-cancel, if built, must go through a column-scoped SECURITY DEFINER RPC.
DROP POLICY IF EXISTS signups_update_member_or_buyer_cancel ON public.signups;

CREATE POLICY signups_update_member ON public.signups
  FOR UPDATE TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));
