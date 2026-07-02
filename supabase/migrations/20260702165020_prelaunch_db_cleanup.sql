-- Pre-launch DB cleanup + hardening (post-consolidation audit, buckets 1+2).
--
-- Dead weight — every drop verified against src/, supabase/functions/, other
-- DB functions (pg_proc.prosrc) and policies before removal:
--   * waitlist (+ its rate-limit trigger fn): 0 rows, zero references anywhere.
--     The prelaunch email-collection feature never shipped past the table.
--   * tg_teams_updated_at: orphaned by the teams drop (20260702153923).
--   * find_seller_by_owner_email: fed the deleted email-invite flow.
--   * check_session_conflict / check_sessions_conflicts /
--     enforce_session_no_conflict: a closed dead island — the trigger was
--     detached by 20260420191427_allow_session_overlap; nothing calls the RPCs.
--   * count_signups_by_ticket_type, calculate_package_end_date: zero callers
--     (create_signup_if_available computes package_end_date inline).
--   * account_deletion_preflight: the delete-account edge function calls
--     _account_deletion_blockers directly; this authenticated-exposed wrapper
--     served a UI that never shipped.
--   * get_seller_private + sellers.phone: the function had zero callers and
--     existed to serve phone/organization_number; organization_number stays
--     (edge-read), phone had no reader or writer left.
--   * sellers.settings: never selected or updated by anything.
--   * idx_team_invite_links_code: duplicate of seller_invite_links_code_key.
--
-- Hardening:
--   * check_email_auth_status was an unthrottled anon email-enumeration
--     oracle (returns email_exists + has_password). Now rate-limited per
--     probed email. (SQL has no client IP, so this caps per-address probing;
--     an IP-keyed limit would need an edge-function proxy.)
--   * seller_invite_links UPDATE narrowed to (revoked_at) — the only column
--     the revoke path writes; table-wide UPDATE let a host rewrite code/expiry.
--   * _normalize_slug EXECUTE revoked from authenticated (only called inside
--     SECURITY DEFINER functions).
--   * public_storefront_scope / public_studio_location search_path re-pinned
--     to the repo-standard 'pg_catalog, public'.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Dead weight.
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE public.waitlist;
DROP FUNCTION public.waitlist_rate_limit();
DROP FUNCTION public.tg_teams_updated_at();
DROP FUNCTION public.find_seller_by_owner_email(text);
DROP FUNCTION public.enforce_session_no_conflict();
DROP FUNCTION public.check_sessions_conflicts(uuid, jsonb, uuid);
DROP FUNCTION public.check_session_conflict(uuid, date, time, time, uuid);
DROP FUNCTION public.count_signups_by_ticket_type(uuid, uuid);
DROP FUNCTION public.calculate_package_end_date(date, integer);
DROP FUNCTION public.account_deletion_preflight();
DROP FUNCTION public.get_seller_private(uuid);
DROP INDEX public.idx_team_invite_links_code;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. sellers.phone + sellers.settings — redefine the two dependents first.
-- ═══════════════════════════════════════════════════════════════════════════

-- 2a. Protection trigger loses the phone check (column is going away).
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_account_status IS DISTINCT FROM OLD.stripe_account_status THEN
    RAISE EXCEPTION 'sellers.stripe_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.operating_model IS DISTINCT FROM OLD.operating_model
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 2b. GDPR export loses the seller phone key (profile phone stays).
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT jsonb_build_object(
    'export_generated_at', now(),
    'subject_user_id', p_user_id,
    'account', (
      SELECT jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at
      )
      FROM auth.users u WHERE u.id = p_user_id
    ),
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'name', p.name,
        'phone', p.phone,
        'role', p.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'onboarding_completed_at', p.onboarding_completed_at
      )
      FROM public.profiles p WHERE p.id = p_user_id
    ),
    'bookings', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'course_id', s.course_id,
        'course_title', c.title,
        'participant_name', s.participant_name,
        'participant_email', s.participant_email,
        'participant_phone', s.participant_phone,
        'status', s.status,
        'payment_status', s.payment_status,
        'amount_paid', s.amount_paid,
        'refund_amount', s.refund_amount,
        'refunded_at', s.refunded_at,
        'note', s.note,
        'ticket_label', s.ticket_label_snapshot,
        'created_at', s.created_at
      ) ORDER BY s.created_at), '[]'::jsonb)
      FROM public.signups s
      LEFT JOIN public.courses c ON c.id = s.course_id
      WHERE s.buyer_id = p_user_id
    ),
    'seller_memberships', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'seller_id', sm.seller_id,
        'role', sm.role,
        'member_since', sm.created_at,
        'business', jsonb_build_object(
          'name', se.name,
          'email', se.email,
          'organization_number', se.organization_number,
          'operating_model', se.operating_model,
          'storefront_slug', se.slug,
          'created_at', se.created_at,
          'locations', (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'name', tl.name,
              'address', tl.address
            ) ORDER BY tl.created_at), '[]'::jsonb)
            FROM public.teacher_locations tl WHERE tl.seller_id = se.id
          )
        )
      ) ORDER BY sm.created_at), '[]'::jsonb)
      FROM public.seller_members sm
      JOIN public.sellers se ON se.id = sm.seller_id
      WHERE sm.user_id = p_user_id
    )
  );
$$;
REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO service_role;

-- 2c. The drops. Column-level grants die with the columns.
ALTER TABLE public.sellers DROP COLUMN phone;
ALTER TABLE public.sellers DROP COLUMN settings;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Hardening.
-- ═══════════════════════════════════════════════════════════════════════════

-- 3a. Rate-limit the auth-screen email probe. Same return contract; the auth
--     page already degrades to a generic error toast on RPC failure. 15/hour
--     per address is far above legitimate login-screen usage.
CREATE OR REPLACE FUNCTION public.check_email_auth_status(p_email text)
RETURNS TABLE(email_exists boolean, has_password boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT public.check_rate_limit('email-auth-status:' || lower(trim(p_email)), 15, 3600) THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.email = lower(trim(p_email))
    ) AS email_exists,
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.email = lower(trim(p_email))
        AND u.encrypted_password IS NOT NULL
        AND u.encrypted_password <> ''
    ) AS has_password;
END;
$$;

-- 3b. Least-privilege trims.
REVOKE EXECUTE ON FUNCTION public._normalize_slug(text) FROM authenticated;

REVOKE UPDATE ON public.seller_invite_links FROM authenticated;
GRANT UPDATE (revoked_at) ON public.seller_invite_links TO authenticated;

-- 3c. Align the two consolidation-era functions with the repo-standard pin.
ALTER FUNCTION public.public_storefront_scope(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.public_studio_location(text) SET search_path = pg_catalog, public;
