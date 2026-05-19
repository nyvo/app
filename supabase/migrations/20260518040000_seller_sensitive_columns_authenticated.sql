-- Finish what 20260518030000_lock_down_anon_select_on_sellers_teams.sql
-- started: lock sensitive seller columns away from the `authenticated` role
-- as well, not just `anon`. Before this migration, any logged-in user (a
-- student who just signed up, a teacher at a different studio) could SELECT
-- another seller's KYC URL by going straight to the sellers table.
--
-- Same column-GRANT mechanism as before. Member-gated access to the
-- now-private columns is exposed through a SECURITY DEFINER RPC,
-- get_seller_private, so the seller's own admin/owner UI keeps working.

revoke select on public.sellers from authenticated;
grant select (
  id,
  name,
  logo_url,
  email,
  seller_type,
  created_at,
  updated_at,
  dintero_onboarding_complete,
  dintero_seller_id,
  dintero_onboarding_status
) on public.sellers to authenticated;

-- Returns sensitive fields for one seller only when the caller is a member.
-- Non-members get zero rows back (the WHERE filters them out). SECURITY
-- DEFINER means the function runs with the owner's privileges, so we
-- bypass the column-GRANT lockdown above — the membership check is the
-- authorization boundary instead.
create or replace function public.get_seller_private(p_seller_id uuid)
returns table (
  dintero_approval_id text,
  dintero_contract_url text,
  phone text,
  organization_number text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    s.dintero_approval_id,
    s.dintero_contract_url,
    s.phone,
    s.organization_number
  from public.sellers s
  where s.id = p_seller_id
    and public.is_seller_member(p_seller_id, auth.uid());
$$;

grant execute on function public.get_seller_private(uuid) to authenticated;
