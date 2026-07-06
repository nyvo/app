// Cron-triggered sweep for orphaned Stripe payment attempts.
//
// Primary finalization happens via the stripe-connect-webhook. This cron
// catches the edge case where the webhook was down or the function was
// killed mid-flight after minting the signup but before capturing — leaving
// the attempt stuck at 'pending' or 'authorized'.
//
// For each payment_attempt with a stripe_payment_intent_id still pending/
// authorized after a short grace window, we check the live PaymentIntent
// status at Stripe. requires_capture => run the capacity check + capture
// (idempotent). succeeded => reconcile the attempt row. canceled/failed =>
// mark the attempt voided/failed. Buyers who never complete the payment
// flow are abandoned after 24h.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  retrievePaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
} from '../_shared/stripe.ts'
import { claimEvent, releaseEventClaim } from '../_shared/webhook-claims.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
// Shared cron auth secret. Prefer CRON_SECRET; fall back to the legacy
// DINTERO_CRON_SECRET name during the rename transition (not Dintero-specific).
const cronSecret = Deno.env.get('CRON_SECRET') || Deno.env.get('DINTERO_CRON_SECRET') || ''

// Grace window: don't touch attempts younger than this (gives the client's own
// finalize call a chance to run first without us racing it).
const GRACE_MINUTES = 2
// Abandonment window: attempts older than this whose buyer never completed the
// Stripe payment are treated as abandoned.
const ABANDON_HOURS = 24
// Per-run cap: 1-4 serial Stripe round-trips per attempt means an unbounded
// backlog (e.g. after a webhook outage) would blow past the cron cadence and
// the isolate wall clock. Oldest-first keeps the backlog draining FIFO.
const MAX_ATTEMPTS_PER_RUN = 100
// Overlap guard key in processed_webhook_events (claimEvent's stale-reclaim
// means a hard-killed run blocks followers for at most ~5 minutes).
const RUN_LOCK_KEY = 'sweep-pending-payments:run'

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = auth === `Bearer ${supabaseServiceKey}`
  const hasCronSecret = cronSecret && providedSecret === cronSecret

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Overlap guard: runs fire every 2 minutes; one that outlives the cadence
  // (big backlog, slow Stripe) must not race a newer run on the same attempts —
  // capture is idempotent at Stripe, but the cancel/void branches are not.
  const runClaim = await claimEvent(supabase, RUN_LOCK_KEY, 'cron_lock')
  if (runClaim !== 'claimed') {
    return new Response(JSON.stringify({ skipped: 'run_in_progress' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const graceCutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString()

    const summary = {
      checked: 0,
      finalized: 0,
      marked_failed: 0,
      still_pending: 0,
      errors: 0,
    }

    // ── Stripe orphans ──────────────────────────────────────────────────────
    // Backstop for when stripe-connect-webhook never captured a requires_capture PI — endpoint
    // down past Stripe's retry window, OR the function was killed mid-flight after minting the
    // signup but before capturing (leaving the attempt stuck at 'authorized'). We therefore sweep
    // BOTH 'pending' and 'authorized' attempts, and — crucially — do NOT apply the 24h abandon
    // floor to capturable PIs: a manual-capture authorization is valid ~7 days, far longer than the
    // 24h floor, so the exact disaster this pass exists for must stay reachable for the whole auth
    // lifetime. The 24h floor is applied (below) only to PIs the buyer never completed. Capture
    // idempotency is enforced by Stripe's single-capture rule (a second capture is rejected), NOT
    // by the RPC's stripe:pi: advisory lock (which serializes only the signup mint) — the
    // capture-race branch below treats an already-captured PI as success.
    const abandonCutoffMs = Date.now() - ABANDON_HOURS * 60 * 60 * 1000
    const { data: stripeOrphans, error: stripeErr } = await supabase
      .from('payment_attempts')
      .select('id, status, created_at, stripe_payment_intent_id, seller_id, course_id, ticket_type_id, participant_name, participant_email, participant_phone, note, course_session_id, platform_fee_nok')
      .in('status', ['pending', 'authorized'])
      .not('stripe_payment_intent_id', 'is', null)
      .lt('created_at', graceCutoff)
      .order('created_at', { ascending: true })
      .limit(MAX_ATTEMPTS_PER_RUN)

    if (stripeErr) {
      // Don't fail the whole sweep — log and continue.
      console.error('sweep: failed to load stripe orphans:', stripeErr.message)
    }

    summary.checked += stripeOrphans?.length || 0

    for (const attempt of stripeOrphans || []) {
      try {
        const piId = attempt.stripe_payment_intent_id as string
        let pi
        try {
          pi = await retrievePaymentIntent(piId)
        } catch (_err) {
          summary.errors++
          continue
        }

        if (pi.status === 'requires_capture') {
          // Webhook never captured — run the capacity check + capture here, regardless of age
          // (up to Stripe's ~7-day auth window). Recovers both 'pending' attempts and the
          // 'authorized' attempts left behind by a webhook killed between mint and capture.
          if (!attempt.ticket_type_id) {
            try { await cancelPaymentIntent(piId) } catch (_e) { /* non-fatal */ }
            await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
            summary.marked_failed++
            continue
          }
          // Don't capture a dead booking: the course was cancelled/unpublished, OR a signup
          // already exists for this PI and was cancelled (teacher cancelled during the
          // webhook-missed window, or cancel-course's own void failed and left the row confirmed).
          // The RPC's course-cancelled guard is bypassed on the dedup ('already_processed') path,
          // so we check both here. Best-effort backstop; the cancel paths' live-PI reconcile remains
          // the authoritative protection — but this prevents charging for a cancelled course/booking.
          const [{ data: existingSignup }, { data: courseRow }] = await Promise.all([
            supabase.from('signups').select('status').eq('stripe_payment_intent_id', piId).maybeSingle(),
            supabase.from('courses').select('status').eq('id', attempt.course_id).maybeSingle(),
          ])
          const bookingDead =
            courseRow?.status === 'cancelled' || courseRow?.status === 'draft' ||
            (!!existingSignup && (existingSignup.status === 'cancelled' || existingSignup.status === 'course_cancelled'))
          if (bookingDead) {
            try { await cancelPaymentIntent(piId) } catch (_e) { /* non-fatal */ }
            await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
            summary.marked_failed++
            continue
          }
          const { data: signupResult, error: rpcErr } = await supabase.rpc('create_signup_if_available', {
            p_seller_id: attempt.seller_id,
            p_course_id: attempt.course_id,
            p_ticket_type_id: attempt.ticket_type_id,
            p_participant_name: attempt.participant_name,
            p_participant_email: attempt.participant_email,
            p_participant_phone: attempt.participant_phone,
            p_amount_paid: pi.amount / 100,
            p_platform_fee_nok: attempt.platform_fee_nok ?? 0,
            p_course_session_id: attempt.course_session_id,
            p_note: attempt.note ?? null,
            p_payment_product: 'stripe',
            p_stripe_payment_intent_id: piId,
          })
          if (rpcErr) { summary.errors++; continue } // transient — retry next sweep

          // ANY reject → cancel + void, never capture. This includes 'duplicate_signup': the
          // buyer already holds a confirmed booking via a DIFFERENT payment (two-tab double
          // checkout) — capturing THIS PI would charge them twice with no signup row to show
          // for it. The PI-retry case ("signup exists for this PI") never lands here: the RPC's
          // dedup path returns it as already_processed SUCCESS, handled below.
          if (!signupResult || !signupResult.success) {
            try { await cancelPaymentIntent(piId) } catch (_e) { /* non-fatal */ }
            await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
            summary.marked_failed++
            continue
          }

          // Signup exists (created / already_processed) → ensure captured.
          try {
            await capturePaymentIntent(piId)
          } catch (_err) {
            // The webhook may have captured this PI concurrently (the advisory lock serializes the
            // mint, not the capture). If it's now succeeded, that's success — not an error.
            let recheck: { status: string } | null = null
            try { recheck = await retrievePaymentIntent(piId) } catch (_e) { recheck = null }
            if (recheck?.status === 'succeeded') {
              await supabase.from('payment_attempts').update({ status: 'captured', payment_product: 'stripe' }).eq('id', attempt.id)
              summary.finalized++
              continue
            }
            summary.errors++ // auth still valid — retry next sweep
            continue
          }
          await supabase.from('payment_attempts').update({ status: 'captured', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.finalized++
        } else if (pi.status === 'succeeded') {
          // Already captured by the webhook (which mints the signup before capturing) but the
          // attempt was left pending/authorized — reconcile the attempt row.
          await supabase.from('payment_attempts').update({ status: 'captured', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.finalized++
        } else if (pi.status === 'canceled') {
          await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.marked_failed++
        } else if (pi.status === 'processing') {
          // Async settlement in flight — never abandon; a later sweep sees succeeded/canceled.
          summary.still_pending++
        } else {
          // requires_payment_method / requires_confirmation / requires_action — buyer never
          // completed. Abandon only once past the 24h floor; until then a retry may still finish.
          const createdMs = attempt.created_at ? new Date(attempt.created_at as string).getTime() : Date.now()
          if (createdMs < abandonCutoffMs) {
            // Cancel the still-confirmable PI as we abandon the attempt. Otherwise
            // a buyer reopening a stale tab (after the 14-day purge deleted the
            // attempt) could still authorize a charge that maps to no signup —
            // an orphaned ~7-day card hold with no booking. Cancel is legal in
            // these non-terminal PI states; tolerate a race where it already
            // moved on.
            try {
              await cancelPaymentIntent(attempt.stripe_payment_intent_id as string)
            } catch (_cancelErr) {
              // Already canceled/succeeded/processing elsewhere — the status
              // branches above handle those on the next run.
            }
            await supabase.from('payment_attempts').update({ status: 'failed', payment_product: 'stripe' }).eq('id', attempt.id)
            summary.marked_failed++
          } else {
            summary.still_pending++
          }
        }
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
    try {
      await releaseEventClaim(supabase, RUN_LOCK_KEY)
    } catch (_e) {
      // Non-fatal — a leaked lock is stale-reclaimed by claimEvent in ~5 min.
    }
  }
})
