-- Pre-launch audit fixes C3 + C1a + H5 + M3/M4 (see .context/db-audit/AUDIT-REPORT.md)
--
-- 1. Flip the default: Supabase's ALTER DEFAULT PRIVILEGES auto-granted EXECUTE
--    on every new public function to anon/authenticated, so any migration that
--    forgot the REVOKE pattern silently exposed its function (this produced the
--    surplus grants below). After this, public RPCs must opt in with an explicit
--    GRANT — which is already this repo's convention (see CLAUDE.md).
-- 2. Revoke the surplus grants that default produced.
-- 3. Drop two dead functions: create_course_idempotent (references columns
--    `level`/`style_id` and type `course_level` that were dropped pre-baseline —
--    it errors at runtime; zero callers) and the orphaned 12-arg
--    create_signup_if_available overload (pre-hardening logic; superseded by the
--    15-arg version; 20260610110000 dropped the 14-arg one but missed this).

-- ── 1. Default privileges ────────────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
-- service_role keeps its default grant: edge functions call internal RPCs.

-- ── 2. Surplus grants on existing functions ──────────────────────────────────
-- create_signup_if_available is called exclusively by edge functions with the
-- service-role client (dintero-webhook, finalize-dintero-transaction,
-- create-free-signup, create-manual-signup). The anon/authenticated grants let
-- callers bypass edge-function validation and rate limiting (C1).
REVOKE ALL ON FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric, p_dintero_transaction_id text, p_dintero_session_id text,
  p_dintero_merchant_reference text, p_course_session_id uuid, p_buyer_id uuid,
  p_note text, p_payment_product text, p_payment_status text
) FROM PUBLIC, anon, authenticated;

-- Member-gated inside, but returns Stripe customer id + Dintero ids; the anon
-- grant was surplus (anon always got zero rows via the is_seller_member guard).
REVOKE ALL ON FUNCTION public.get_seller_operational(p_seller_id uuid)
  FROM PUBLIC, anon;

-- Trigger functions are not callable outside trigger context, but these three
-- missed the REVOKE pattern and trip security lints.
REVOKE ALL ON FUNCTION public.sellers_block_protected_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_default_tier_price_on_course_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_single_ticket_label() FROM PUBLIC, anon, authenticated;

-- notifications are written by service role only; clients never need nextval().
REVOKE ALL ON SEQUENCE public.notifications_id_seq FROM anon, authenticated;

-- Consistency: the only SECURITY DEFINER function whose search_path lacked
-- pg_catalog (every other definer fn pins both).
ALTER FUNCTION public.public_studio_location(p_team_slug text)
  SET search_path = pg_catalog, public;

-- ── 3. Dead functions ────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.create_course_idempotent(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, numeric, integer, date, date, uuid, text, uuid);

DROP FUNCTION IF EXISTS public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid);
