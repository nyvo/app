import { supabase } from '@/lib/supabase';
import type { SellerAffiliation } from '@/types/database';

// ---------------------------------------------------------------------------
// Storefront syndication: a host seller (studio) lets a guest seller advertise
// their courses on the host's storefront. A row in seller_affiliations existing
// means the link is active — there is no status column. Rows are created only
// by the redeem RPC (invite-links) and removed via `.delete()`; the client
// cannot INSERT/UPDATE (RLS). The single-host policy (a guest can have at most
// one host) is enforced in the redeem RPC.
// ---------------------------------------------------------------------------

/** A guest affiliated with a host, for the host's instructor list. */
export interface HostAffiliate {
  guest_seller_id: string;
  guest: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

/** The host a guest is affiliated with, for the guest's studio view. */
export interface GuestHost {
  host_seller_id: string;
  host: {
    id: string;
    slug: string;
    name: string;
    cover_image_url: string | null;
  };
}

/** Every guest affiliated with `hostSellerId` (the studio side). RLS enforces
 * that the caller manages the host. */
export async function fetchHostAffiliates(
  hostSellerId: string,
): Promise<{ data: HostAffiliate[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('seller_affiliations')
    .select(`
      guest_seller_id,
      guest:sellers!seller_affiliations_guest_fkey(id, name, logo_url)
    `)
    .eq('host_seller_id', hostSellerId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error as Error };
  return { data: (data ?? []) as unknown as HostAffiliate[], error: null };
}

/** The at-most-one host a guest seller is affiliated with, or null. */
export async function fetchGuestHost(
  guestSellerId: string,
): Promise<{ data: GuestHost | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('seller_affiliations')
    .select(`
      host_seller_id,
      host:sellers!seller_affiliations_host_fkey(id, slug, name, cover_image_url)
    `)
    .eq('guest_seller_id', guestSellerId)
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error as Error };
  return { data: (data as unknown as GuestHost | null) ?? null, error: null };
}

/**
 * Either side withdraws the affiliation. RLS allows the host's managers OR the
 * guest seller's members. Deletes the single (host, guest) row.
 */
export async function revokeAffiliation(input: {
  hostSellerId: string;
  guestSellerId: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('seller_affiliations')
    .delete()
    .eq('host_seller_id', input.hostSellerId)
    .eq('guest_seller_id', input.guestSellerId);

  if (error) return { error: error as Error };
  return { error: null };
}

// Re-export the canonical type for consumers.
export type { SellerAffiliation };
