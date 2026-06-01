-- Prelaunch hardening, part 5:
-- make public schema function EXECUTE privileges explicit.

ALTER FUNCTION public._normalize_team_slug(text)
  SET search_path TO 'pg_catalog', 'public';

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Public, intentionally anonymous read-only RPCs.
GRANT EXECUTE ON FUNCTION public.available_ticket_types(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_signup_by_dintero_id(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_team_invite_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_signup_counts(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_storefront_seller_ids(text) TO anon, authenticated;

-- Authenticated frontend RPCs and RLS helpers.
GRANT EXECUTE ON FUNCTION public._normalize_team_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_buyer_onboarding(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_invite_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_course_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_seller_for_user(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_private(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seller_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seller_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_seller_onboarding_complete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_invite_link(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_team_slug(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_course_image(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_seller_logo(text) TO authenticated;
