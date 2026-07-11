-- Launch audit: account deletion doesn't check for a live paid subscription.
--
-- _account_deletion_blockers classifies each seller a deleting profile solely
-- owns as either "blocking" (unfinished business — active courses/payments)
-- or "dormant" (auto-closed + anonymized by enforce_profile_delete_guard, see
-- 20260605100000). A sole owner on an active Stripe Billing subscription with
-- otherwise-quiet courses currently falls into "dormant" — the seller gets
-- closed and anonymized while Stripe keeps billing a studio nobody can log
-- into or cancel from.
--
-- "Active" definition — subscription_plan = 'pro' AND subscription_status IN
-- ('active', 'past_due'), same predicate already used for
-- sellers.uses_integrated_payments (20260620120000) and set_operating_model's
-- v_repricing check (20260702153923). Verified against
-- stripe-billing-webhook/handler.ts: stripeStatusToSellerStatus maps Stripe's
-- 'active'/'trialing' to 'active', and syncSubscription writes
-- subscription_cancel_at_period_end independently of subscription_status —
-- Stripe keeps a subscription's status = 'active' all the way through a
-- portal cancellation's wind-down; it only flips to 'canceled' when the
-- subscription.deleted event fires at the actual period end. So
-- subscription_status = 'active' ALREADY covers "cancelled but still in the
-- paid period" — no separate check of subscription_cancel_at_period_end is
-- needed. past_due is included because the app treats it as full Pro
-- elsewhere (0% platform take / "already has Pro" guard, per the same
-- webhook) — it's still a live, billing Stripe subscription that needs an
-- owner to cancel it. subscription_external_id IS NOT NULL guards against a
-- plan/status flag surviving without a linked Stripe subscription (mirrors
-- set_operating_model's v_repricing check).
--
-- Shape: blocking_studios keeps its existing {seller_id, name} shape and
-- gains an optional `reason` field (only set to 'active_subscription', never
-- present otherwise — jsonb_strip_nulls drops the key) so delete-account's
-- blockerMessage can surface accurate Norwegian copy without changing
-- `deletable` semantics or breaking any consumer that only reads
-- seller_id/name. dormant_studios and active_instructor_courses are
-- untouched.
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_block   jsonb;
  v_dormant jsonb;
BEGIN
  WITH sole AS (
    SELECT s.id, s.name
    FROM public.sellers s
    WHERE EXISTS (
            SELECT 1 FROM public.seller_members sm
            WHERE sm.seller_id = s.id AND sm.user_id = p_user_id AND sm.role = 'owner')
      AND (SELECT count(*) FROM public.seller_members sm2
           WHERE sm2.seller_id = s.id AND sm2.role = 'owner') = 1
      AND s.closed_at IS NULL
  ), classified AS (
    SELECT
      so.id,
      so.name,
      public._seller_has_unfinished_business(so.id) AS has_unfinished,
      EXISTS (
        SELECT 1 FROM public.sellers s2
        WHERE s2.id = so.id
          AND s2.subscription_plan = 'pro'
          AND s2.subscription_status IN ('active', 'past_due')
          AND s2.subscription_external_id IS NOT NULL
      ) AS has_active_subscription
    FROM sole so
  )
  SELECT
    coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'seller_id', id,
      'name', name,
      'reason', CASE WHEN NOT has_unfinished AND has_active_subscription
                     THEN 'active_subscription' END
    ))) FILTER (WHERE has_unfinished OR has_active_subscription), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('seller_id', id, 'name', name))
      FILTER (WHERE NOT has_unfinished AND NOT has_active_subscription), '[]'::jsonb)
  INTO v_block, v_dormant
  FROM classified;

  RETURN jsonb_build_object(
    'blocking_studios',          v_block,
    'dormant_studios',           v_dormant,
    'active_instructor_courses', '[]'::jsonb,
    'deletable',                 jsonb_array_length(v_block) = 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public._account_deletion_blockers(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) TO service_role;
