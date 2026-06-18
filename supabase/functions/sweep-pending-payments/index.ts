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
    // Backstop for the rare case stripe-connect-webhook never captured a
    // requires_capture PI (endpoint down past Stripe's multi-day retry window).
    // Mirrors the webhook's amount_capturable_updated handler; idempotent via
    // create_signup_if_available's stripe:pi: advisory lock.
    const { data: stripeOrphans, error: stripeErr } = await supabase
      .from('payment_attempts')
      .select('id, stripe_payment_intent_id, seller_id, course_id, ticket_type_id, participant_name, participant_email, participant_phone, note, course_session_id')
      .eq('status', 'pending')
      .not('stripe_payment_intent_id', 'is', null)
      .lt('created_at', graceCutoff)
      .gt('created_at', abandonCutoff)

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
          // Webhook never captured — run the capacity check + capture here.
          if (!attempt.ticket_type_id) {
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
            await supabase.from('payment_attempts').update({ status: 'voided' }).eq('id', attempt.id)
            summary.marked_failed++
            continue
          }

          // Signup exists (created / already_processed / already_signed_up) → ensure captured.
          try {
            await capturePaymentIntent(piId)
          } catch (_err) {
            summary.errors++ // auth still valid — retry next sweep
            continue
          }
          await supabase.from('payment_attempts').update({ status: 'captured', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.finalized++
        } else if (pi.status === 'succeeded') {
          // Already captured by the webhook (which mints the signup before capturing) but the
          // attempt was left pending — reconcile the attempt row.
          await supabase.from('payment_attempts').update({ status: 'captured', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.finalized++
        } else if (pi.status === 'canceled') {
          await supabase.from('payment_attempts').update({ status: 'voided', payment_product: 'stripe' }).eq('id', attempt.id)
          summary.marked_failed++
        } else {
          // requires_payment_method / requires_confirmation / requires_action / processing —
          // buyer never completed. Leave pending; the abandon window eventually drops it.
          summary.still_pending++
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
