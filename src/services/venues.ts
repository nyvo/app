import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * Public-read projection of a venue. Matches the columns exposed by the
 * "Venues are publicly readable" RLS policy.
 */
export interface PublicVenue {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  cover_image_url: string | null
}

/**
 * A venue's public payload: the venue row plus the set of visible tenant
 * org IDs, which the venue page then feeds to fetchPublicCourses to get
 * the aggregated course list.
 *
 * We return the ID set (not the full courses) so the venue service stays
 * single-responsibility — the course fetch reuses the existing public-
 * course pipeline with all its enrichment (sessions, signup counts, etc.).
 */
export interface VenueWithMembers {
  venue: PublicVenue
  memberOrganizationIds: string[]
}

export async function fetchVenueBySlug(
  slug: string,
): Promise<{ data: VenueWithMembers | null; error: Error | null }> {
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, slug, name, description, address, city, cover_image_url')
    .eq('slug', slug)
    .maybeSingle()

  if (venueError) {
    logger.error('Error fetching venue:', venueError)
    return { data: null, error: venueError as Error }
  }
  if (!venue) {
    return { data: null, error: null }
  }

  const typedVenue = venue as PublicVenue

  // RLS restricts anon+authenticated reads to visible=true rows, so no
  // extra filter needed here.
  const { data: members, error: membersError } = await supabase
    .from('venue_members')
    .select('organization_id')
    .eq('venue_id', typedVenue.id)

  if (membersError) {
    logger.error('Error fetching venue members:', membersError)
    return { data: null, error: membersError as Error }
  }

  const memberOrganizationIds = (members ?? []).map(
    (m) => (m as { organization_id: string }).organization_id,
  )

  return {
    data: { venue: typedVenue, memberOrganizationIds },
    error: null,
  }
}
