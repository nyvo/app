// deno test --allow-env supabase/functions/_shared/webhook-claims.test.ts
//
// Covers the claim state machine that all three Stripe webhooks and the
// sweep's overlap guard depend on:
//   fresh insert            → claimed
//   duplicate, processed    → duplicate      (respond 200, event done)
//   duplicate, fresh claim  → in_flight      (respond non-2xx, provider retries)
//   duplicate, stale claim  → atomic reclaim (exactly one winner)

import { assertEquals } from 'jsr:@std/assert@1'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { claimEvent } from './webhook-claims.ts'

interface FakeOpts {
  insertError?: { code: string } | null
  existing?: { processed_at: string | null; created_at: string } | null
  reclaimed?: { event_id: string }[]
}

// Minimal chainable stub matching exactly the call shapes claimEvent uses.
function makeClient(opts: FakeOpts): SupabaseClient {
  return {
    from() {
      return {
        insert: () => Promise.resolve({ error: opts.insertError ?? null }),
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: opts.existing ?? null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              lt: () => ({
                select: () => Promise.resolve({ data: opts.reclaimed ?? [] }),
              }),
            }),
          }),
        }),
      }
    },
  } as unknown as SupabaseClient
}

const DUP = { code: '23505' }
const fresh = () => new Date().toISOString()
const stale = () => new Date(Date.now() - 10 * 60 * 1000).toISOString()

Deno.test('fresh insert wins the claim', async () => {
  const result = await claimEvent(makeClient({}), 'stripe:evt_1', 'test')
  assertEquals(result, 'claimed')
})

Deno.test('non-duplicate insert error still claims (downstream is idempotent)', async () => {
  const result = await claimEvent(makeClient({ insertError: { code: '57014' } }), 'stripe:evt_1', 'test')
  assertEquals(result, 'claimed')
})

Deno.test('duplicate with processed_at set is a genuine duplicate', async () => {
  const result = await claimEvent(
    makeClient({ insertError: DUP, existing: { processed_at: fresh(), created_at: stale() } }),
    'stripe:evt_1',
    'test',
  )
  assertEquals(result, 'duplicate')
})

Deno.test('duplicate with fresh unprocessed claim is in_flight (never 200)', async () => {
  const result = await claimEvent(
    makeClient({ insertError: DUP, existing: { processed_at: null, created_at: fresh() } }),
    'stripe:evt_1',
    'test',
  )
  assertEquals(result, 'in_flight')
})

Deno.test('stale tombstone is re-claimed when the conditional update wins', async () => {
  const result = await claimEvent(
    makeClient({
      insertError: DUP,
      existing: { processed_at: null, created_at: stale() },
      reclaimed: [{ event_id: 'stripe:evt_1' }],
    }),
    'stripe:evt_1',
    'test',
  )
  assertEquals(result, 'claimed')
})

Deno.test('stale tombstone reclaim loss (0 rows) reports in_flight', async () => {
  const result = await claimEvent(
    makeClient({
      insertError: DUP,
      existing: { processed_at: null, created_at: stale() },
      reclaimed: [],
    }),
    'stripe:evt_1',
    'test',
  )
  assertEquals(result, 'in_flight')
})

Deno.test('duplicate whose row vanished (concurrent release) reports in_flight', async () => {
  const result = await claimEvent(
    makeClient({ insertError: DUP, existing: null }),
    'stripe:evt_1',
    'test',
  )
  assertEquals(result, 'in_flight')
})
