import { supabase } from '@/lib/supabase';
import type {
  LookupInviteLinkResult,
  RedeemInviteLinkResult,
  SellerInviteLink,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Seller invite links — shareable codes that replace the old email-based invite.
//
// Lifecycle:
//   - Host seller calls createInviteLink(hostSellerId) → new active link (any
//     prior link for the host is revoked server-side).
//   - The host shares the link out of band (DM/SMS/etc).
//   - Invitee opens /join/:code → lookupInviteLink(code) renders the join page.
//   - Invitee confirms → redeemInviteLink(code) creates the seller_affiliation
//     immediately (a row existing = active; no pending step).
//
// The redeem flow handles the single-host-at-a-time constraint by returning
// `has_other_host` on the first call; the join page surfaces the consequence
// and re-invokes with `forceLeave: true` after the user confirms.
// ---------------------------------------------------------------------------

/** Fetch the currently active link for a host seller (admin UI). null if none. */
export async function fetchActiveInviteLink(
  hostSellerId: string,
): Promise<{ data: SellerInviteLink | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('seller_invite_links')
    .select('*')
    .eq('host_seller_id', hostSellerId)
    .is('revoked_at', null)
    // Expired links are dead server-side (lookup/redeem return 'expired');
    // excluding them here makes the panel lazily mint a fresh one instead of
    // showing a link that no longer works.
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error as Error };
  return { data: (data as SellerInviteLink | null) ?? null, error: null };
}

/** Generate a fresh link, revoking any prior active link. Admin-only (RLS). */
export async function createInviteLink(
  hostSellerId: string,
): Promise<{ data: SellerInviteLink | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('create_seller_invite_link', {
    p_host_seller_id: hostSellerId,
  });
  if (error) return { data: null, error: error as Error };
  return { data: (data as SellerInviteLink) ?? null, error: null };
}

/** Revoke the currently active link (without creating a new one). */
export async function revokeInviteLink(
  linkId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('seller_invite_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId);
  if (error) return { error: error as Error };
  return { error: null };
}

/** Public — accessible to anon. Returns host display info for the join page. */
export async function lookupInviteLink(
  code: string,
): Promise<{ data: LookupInviteLinkResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('lookup_seller_invite_link', {
    p_code: code,
  });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as LookupInviteLinkResult | null) ?? null, error: null };
}

/** Authenticated — redeem the code. See migration for status values. */
export async function redeemInviteLink(
  code: string,
  forceLeave = false,
): Promise<{ data: RedeemInviteLinkResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('redeem_seller_invite_link', {
    p_code: code,
    p_force_leave: forceLeave,
  });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as RedeemInviteLinkResult | null) ?? null, error: null };
}
