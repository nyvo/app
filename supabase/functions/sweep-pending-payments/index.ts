// Cron-triggered sweep for orphaned payment attempts.
//
// Primary finalization happens client-side (CheckoutSuccessPage calls
// finalize-dintero-transaction). This cron catches the edge case where the
// customer paid but the client never completed the finalize call — closed
// tab, crashed browser, dropped network between iframe success and redirect.
//
// For each payment_attempt still `pending` after a short grace window, we
// ask Dintero whether a transaction was created for that session. If yes
// and it's AUTHORIZED or CAPTURED, we run finalize (idempotent). If the
// transaction is terminally failed/voided, we mark the attempt failed. If
// no transaction exists at all after 24h, the customer abandoned the
// iframe — mark failed so the row stops showing up in this sweep.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { listTransactionsForSession, type DinteroTransaction } from '../_shared/dintero.ts'
import {
  retrievePaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
} from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('DINTERO_CRON_SECRET') || ''

// Grace window: don't touch attempts younger than this (gives the client's own
// finalize call a chance to run first without us racing it).
const GRACE_MINUTES = 2
// Abandonment window: attempts older than this with no Dintero transaction are
// treated as abandoned (customer closed the iframe without paying).
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

    const graceCutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString()
    const abandonCutoff = new Date(Date.now() - ABANDON_HOURS * 60 * 60 * 1000).toISOString()

    const { data: orphans, error } = await supabase
      .from('payment_attempts')
      .select('id, dintero_session_id, created_at')
      .eq('status', 'pending')
      .not('dintero_session_id', 'is', null)
      .lt('created_at', graceCutoff)
      .gt('created_at', abandonCutoff)

    if (error) {
      return new Response(`Failed to load pending attempts: ${error.message}`, { status: 500 })
    }

    const summary = {
      checked: orphans?.length || 0,
      finalized: 0,
      marked_failed: 0,
      still_pending: 0,
      errors: 0,
    }

    for (const attempt of orphans || []) {
      try {
        let transactions: DinteroTransaction[]
        try {
          transactions = await listTransactionsForSession(attempt.dintero_session_id!)
        } catch (_err) {
          // Dintero-side error — try again next sweep.
          summary.errors++
          continue
        }

        // No transaction → customer opened the iframe but never paid.
        if (transactions.length === 0) {
          summary.still_pending++
          continue
        }

        // Take the most recent transaction for this session.
        const txn = transactions[0]

        if (txn.status === 'AUTHORIZED' || txn.status === 'CAPTURED') {
          // Delegate to the finalize endpoint — same logic the client would run.
          const resp = await fetch(
            `${supabaseUrl}/functions/v1/finalize-dintero-transaction`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                transaction_id: txn.id,
                merchant_reference: attempt.id,
              }),
            },
          )
          if (resp.ok) {
            summary.finalized++
          } else {
            summary.errors++
          }
        } else if (
          txn.status === 'FAILED' ||
          txn.status === 'DECLINED' ||
          txn.status === 'AUTHORIZATION_VOIDED'
        ) {
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed', dintero_transaction_id: txn.id })
            .eq('id', attempt.id)
          summary.marked_failed++
        } else {
          // Unexpected status — leave alone, next sweep will retry.
          summary.still_pending++
        }
      } catch (_err) {
        summary.errors++
      }
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
      .select('id, status, created_at, stripe_payment_intent_id, seller_id, course_id, ticket_type_id, participant_name, participant_email, participant_phone, note, course_session_id')
      .in('status', ['pending', 'authorized'])
      .not('stripe_payment_intent_id', 'is', null)
      .lt('created_at', graceCutoff)

    if (stripeErr) {
      // Don't fail the whole sweep — the Dintero pass already ran.
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
            p_dintero_transaction_id: null,
            p_dintero_session_id: null,
            p_dintero_merchant_reference: null,
            p_course_session_id: attempt.course_session_id,
            p_note: attempt.note ?? null,
            p_payment_product: 'stripe',
            p_stripe_payment_intent_id: piId,
          })
          if (rpcErr) { summary.errors++; continue } // transient — retry next sweep

          // already_signed_up = the signup exists (race/retry); fall through to capture.
          if ((!signupResult || !signupResult.success) && signupResult?.error !== 'already_signed_up') {
            // Genuine capacity/validation reject — cancel the auth + void the attempt.
            try { await cancelPaymentIntent(piId) } catch (_e) { /* non-fatal */ }
            await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
            summary.marked_failed++
            continue
          }

          // Signup exists (created / already_processed / already_signed_up) → ensure captured.
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
  }
})
