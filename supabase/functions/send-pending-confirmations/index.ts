// Retry safety net for post-payment side effects (buyer order-confirm email,
// seller booking.created notification).
//
// Inline delivery happens in dintero-webhook + finalize-dintero-transaction
// success paths. Anything they miss — Resend timeout, edge function crash
// between INSERT and email, transient DB hiccup — leaves
// signups.confirmation_sent_at NULL. This cron picks those up every 5 min
// and retries until the column is set.
//
// Idempotent by construction: seller notification dedupes on dedupe_key;
// buyer email is gated by the confirmation_sent_at column inside
// deliverBookingConfirmations.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('DINTERO_CRON_SECRET') || ''

// Don't retry the inline path's own work — give it a few seconds to land.
const GRACE_SECONDS = 30
// After this much time, stop retrying — the inline path's error logs are
// the source of truth at that point and a stuck row is a real bug to
// investigate rather than to keep hammering.
const ABANDON_HOURS = 24

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = auth === `Bearer ${supabaseServiceKey}`
  const hasCronSecret = cronSecret && providedSecret === cronSecret

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const graceCutoff = new Date(Date.now() - GRACE_SECONDS * 1000).toISOString()
    const abandonCutoff = new Date(Date.now() - ABANDON_HOURS * 60 * 60 * 1000).toISOString()

    const { data: pending, error } = await supabase
      .from('signups')
      .select('id, seller_id, course_id, participant_name, participant_email, amount_paid')
      .eq('payment_status', 'paid')
      .is('confirmation_sent_at', null)
      .lt('created_at', graceCutoff)
      .gt('created_at', abandonCutoff)
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
  }
})
