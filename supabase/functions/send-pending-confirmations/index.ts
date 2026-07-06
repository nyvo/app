// Retry safety net for post-payment side effects (buyer order-confirm email,
// seller booking.created notification).
//
// Inline delivery happens in the stripe-connect-webhook success path.
// Anything it misses — Resend timeout, edge function crash
// between INSERT and email, transient DB hiccup — leaves
// signups.confirmation_sent_at NULL. This cron picks those up every 5 min
// and retries until the column is set.
//
// Idempotent by construction: seller notification dedupes on dedupe_key;
// buyer email is gated by confirmation_sent_at and the seller email by
// seller_notified_at, both inside deliverBookingConfirmations. We retry a
// row until BOTH timestamps are set.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'
import { claimEvent, releaseEventClaim } from '../_shared/webhook-claims.ts'
import { timingSafeEqual } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
// Shared cron auth secret. Prefer CRON_SECRET; fall back to the legacy
// DINTERO_CRON_SECRET name during the rename transition (not Dintero-specific).
const cronSecret = Deno.env.get('CRON_SECRET') || Deno.env.get('DINTERO_CRON_SECRET') || ''

// Don't retry the inline path's own work — give it a few seconds to land.
const GRACE_SECONDS = 30
// After this much time, stop retrying — the inline path's error logs are
// the source of truth at that point and a stuck row is a real bug to
// investigate rather than to keep hammering.
const ABANDON_HOURS = 24
// Overlap guard key in processed_webhook_events. Sends are stamp-AFTER-send
// with a per-row NULL gate, so a run that outlives the 5-min cadence could let
// the next run pick up the same not-yet-stamped rows and double-send. Mirror
// the sweep's run-lock; claimEvent's ~5-min stale-reclaim covers a hard kill.
const RUN_LOCK_KEY = 'send-pending-confirmations:run'

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = timingSafeEqual(auth, `Bearer ${supabaseServiceKey}`)
  const hasCronSecret = timingSafeEqual(providedSecret, cronSecret)

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Overlap guard: a run that outlives the 5-min cadence must not race a newer
  // run onto the same not-yet-stamped rows and double-send.
  const runClaim = await claimEvent(supabase, RUN_LOCK_KEY, 'cron_lock')
  if (runClaim !== 'claimed') {
    return new Response(JSON.stringify({ skipped: 'run_in_progress' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const graceCutoff = new Date(Date.now() - GRACE_SECONDS * 1000).toISOString()
    const abandonCutoff = new Date(Date.now() - ABANDON_HOURS * 60 * 60 * 1000).toISOString()

    const { data: pending, error } = await supabase
      .from('signups')
      .select('id, seller_id, course_id, participant_name, participant_email, amount_paid')
      .eq('payment_status', 'paid')
      .or('confirmation_sent_at.is.null,seller_notified_at.is.null')
      .lt('created_at', graceCutoff)
      .gt('created_at', abandonCutoff)
      // Oldest-first so a backlog > the page size drains FIFO instead of
      // starving the earliest paid buyers within their 24h retry life.
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      return new Response(`Failed to load pending: ${error.message}`, { status: 500 })
    }

    const summary = { checked: pending?.length || 0, sent: 0, errors: 0 }

    for (const row of pending || []) {
      try {
        await deliverBookingConfirmations(
          supabase,
          row.id,
          {
            seller_id: row.seller_id,
            course_id: row.course_id,
            participant_name: row.participant_name,
            participant_email: row.participant_email,
          },
          Number(row.amount_paid) || 0,
        )
        summary.sent++
      } catch (_err) {
        summary.errors++
      }
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    return new Response(`Sweep error: ${message}`, { status: 500 })
  } finally {
    // Free the lock for the next run; a crash before this is covered by the
    // ~5-min stale-reclaim in claimEvent.
    await releaseEventClaim(supabase, RUN_LOCK_KEY)
  }
})
