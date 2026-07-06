// Shared idempotency-claim helpers for webhook handlers (processed_webhook_events).
//
// A claim is a row with processed_at = NULL. The handler that inserts it owns the
// event; on success it stamps processed_at (markEventResult), on a caught error it
// deletes the row (releaseEventClaim) so the provider's retry re-runs the work.
//
// A HARD kill (deploy, wall-clock/OOM kill) runs neither — the row used to become
// a permanent tombstone: every retry hit the duplicate fast-path, got 200, and the
// provider marked the event delivered and stopped retrying forever. For events
// with no other backstop (charge.refunded, subscription syncs, account.updated)
// that meant silent permanent drops. claimEvent therefore distinguishes:
//
//   'duplicate' — processed_at set: genuinely done, respond 200.
//   'in_flight' — unprocessed claim younger than STALE_CLAIM_MS: another isolate
//                 is likely mid-flight. Respond non-2xx so the provider retries;
//                 by then the event is either processed (→ duplicate) or stale.
//   'claimed'   — fresh insert, or an atomic re-claim of a stale tombstone.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export type ClaimResult = 'claimed' | 'duplicate' | 'in_flight'

// Handlers finish in seconds; an unprocessed claim this old is a tombstone from
// a hard-killed run, not live work. Stripe's early retries are minutes apart, so
// a tombstoned event is re-claimed well inside the retry window (~3 days).
const STALE_CLAIM_MS = 5 * 60 * 1000

export async function claimEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<ClaimResult> {
  const { error } = await supabase
    .from('processed_webhook_events')
    .insert({ event_id: eventId, event_type: eventType, result: { status: 'processing' }, processed_at: null })
  if (!error) return 'claimed'
  if (error.code !== '23505') {
    // Non-duplicate insert errors: process anyway; downstream work is idempotent.
    return 'claimed'
  }

  const { data: existing } = await supabase
    .from('processed_webhook_events')
    .select('processed_at, created_at')
    .eq('event_id', eventId)
    .maybeSingle()
  // Row gone between insert and read — a concurrent handler released it.
  // Let the provider retry rather than double-process now.
  if (!existing) return 'in_flight'
  if (existing.processed_at !== null) return 'duplicate'

  const ageMs = Date.now() - new Date(existing.created_at as string).getTime()
  if (ageMs < STALE_CLAIM_MS) return 'in_flight'

  // Tombstone — re-claim. The conditional update makes exactly one concurrent
  // retry the new owner; losers see zero rows and report in_flight.
  const staleCutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString()
  const { data: reclaimed } = await supabase
    .from('processed_webhook_events')
    .update({ created_at: new Date().toISOString(), result: { status: 'processing' } })
    .eq('event_id', eventId)
    .is('processed_at', null)
    .lt('created_at', staleCutoff)
    .select('event_id')
  return reclaimed && reclaimed.length > 0 ? 'claimed' : 'in_flight'
}

export async function markEventResult(
  supabase: SupabaseClient,
  eventId: string,
  result: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .update({ result, processed_at: new Date().toISOString() })
    .eq('event_id', eventId)
}

export async function releaseEventClaim(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  await supabase
    .from('processed_webhook_events')
    .delete()
    .eq('event_id', eventId)
    .is('processed_at', null)
}
