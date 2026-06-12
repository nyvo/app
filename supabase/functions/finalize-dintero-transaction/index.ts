// Client-driven finalizer for Dintero transactions in the embedded flow.
// Replaces reliance on async webhook delivery — the success page calls this
// endpoint after the iframe authorizes, and we deterministically finish the
// transaction server-side (capacity check → capture → signup).
//
// Idempotent. Safe to call multiple times. State machine:
//
//   transaction.status = AUTHORIZED
//     → create_signup_if_available (ticket-type-aware, advisory-locked)
//         success → captureTransaction → status=captured, signup=confirmed
//         failure (capacity / sold out / expired) → voidTransaction → status=voided
//   transaction.status = CAPTURED
//     → ensure signup exists (best-effort create; unique_violation is fine)
//   transaction.status = FAILED | DECLINED
//     → mark attempt failed, return error
//
// No auth required — the transaction_id + merchant_reference are the credential.
// Server verifies the transaction exists at Dintero and its merchant_reference
// matches our payment_attempt row, preventing forged calls.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  captureIfAuthorized,
  getTransaction,
  voidTransaction,
  type DinteroTransaction,
} from '../_shared/dintero.ts'
import { getCorsHeaders, handleCors } from '../_shared/auth.ts'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface FinalizeRequest {
  transaction_id: string
  merchant_reference?: string
}

interface FinalizeResult {
  signup_id: string
  status: 'confirmed' | 'already_processed'
}

function toOre(value: unknown): number | null {
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : NaN
  if (!Number.isFinite(amount)) return null
  return Math.round(amount * 100)
}

function jsonFor(req: Request) {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))
  return (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const json = jsonFor(req)

  try {
    const body = (await req.json()) as FinalizeRequest
    const transactionId = body.transaction_id?.trim()
    const merchantReference = body.merchant_reference?.trim()

    if (!transactionId) {
      return json({ error: 'Missing transaction_id' }, 400)
    }

    // Require merchant_reference alongside transaction_id. Caller must attest to the
    // payment_attempt it expects to finalize; server verifies the attestation matches
    // what Dintero has. Without this, an attacker with a leaked transaction_id could
    // finalize someone else's payment by omitting the field and letting the server
    // trust Dintero's echoed reference unilaterally.
    if (!merchantReference) {
      return json({ error: 'Missing merchant_reference' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the live transaction from Dintero FIRST so we can validate the
    // caller's claimed merchant_reference against Dintero's source of truth
    // before doing any DB reads. Prevents a caller who knows a transaction_id
    // but not the matching merchant_reference from learning signup state via
    // the "already processed" short-circuit below.
    let transaction: DinteroTransaction
    try {
      transaction = await getTransaction(transactionId)
    } catch (err) {
      console.error('finalize-dintero-transaction: getTransaction failed', err)
      return json({ error: 'Kunne ikke laste transaksjonen. Prøv igjen.' }, 502)
    }

    const dinteroMerchantRef = transaction.merchant_reference ?? null

    if (!dinteroMerchantRef) {
      return json({ error: 'Transaction has no merchant_reference' }, 400)
    }

    // Client must attest to the same merchant_reference Dintero has on the transaction.
    if (merchantReference !== dinteroMerchantRef) {
      return json({ error: 'merchant_reference mismatch' }, 400)
    }

    // Short-circuit: if a signup already exists for this transaction, return
    // it. Safe to run here because the mismatch check above has already
    // confirmed the caller's merchant_reference matches reality.
    {
      const { data: existing } = await supabase
        .from('signups')
        .select('id')
        .eq('dintero_transaction_id', transactionId)
        .maybeSingle()
      if (existing) {
        return json({ signup_id: existing.id, status: 'already_processed' } satisfies FinalizeResult, 200)
      }
    }

    // Look up the payment_attempt row (our pre-payment context).
    const { data: attempt } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('id', merchantReference)
      .maybeSingle()

    if (!attempt) {
      return json({ error: 'Payment attempt not found' }, 404)
    }

    const expectedAmountOre = toOre(attempt.total_price_nok)
    if (
      (transaction.status === 'AUTHORIZED' || transaction.status === 'CAPTURED') &&
      expectedAmountOre !== transaction.amount
    ) {
      console.error('finalize-dintero-transaction: amount mismatch', {
        transactionId,
        merchantReference,
        expectedAmountOre,
        transactionAmountOre: transaction.amount,
      })

      if (transaction.status === 'AUTHORIZED') {
        try {
          await voidTransaction(transactionId)
        } catch (_voidErr) {
          // Non-fatal; still prevent signup creation/capture.
        }
      }

      await supabase
        .from('payment_attempts')
        .update({
          status: transaction.status === 'AUTHORIZED' ? 'voided' : 'failed',
          dintero_transaction_id: transactionId,
          payment_product: transaction.payment_product ?? null,
        })
        .eq('id', attempt.id)

      return json({ error: 'amount_mismatch' }, 409)
    }

    const amountNok = transaction.amount / 100

    // Route by Dintero transaction status.
    if (transaction.status === 'FAILED' || transaction.status === 'DECLINED') {
      await supabase
        .from('payment_attempts')
        .update({ status: 'failed' })
        .eq('id', attempt.id)
      return json({ error: 'payment_failed', status: transaction.status }, 400)
    }

    if (transaction.status === 'AUTHORIZATION_VOIDED') {
      await supabase
        .from('payment_attempts')
        .update({ status: 'voided' })
        .eq('id', attempt.id)
      return json({ error: 'authorization_voided' }, 400)
    }

    if (transaction.status !== 'AUTHORIZED' && transaction.status !== 'CAPTURED') {
      return json({ error: `Unexpected status: ${transaction.status}` }, 409)
    }

    // Payment-link flow short-circuit: existing signup, no capacity check.
    if (attempt.existing_signup_id) {
      if (transaction.status === 'AUTHORIZED') {
        try {
          await captureIfAuthorized(transactionId, transaction.amount)
        } catch (err) {
          console.error('finalize-dintero-transaction: capture failed (payment-link)', err)
          await supabase
            .from('signups')
            .update({ payment_status: 'failed' })
            .eq('id', attempt.existing_signup_id)
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed' })
            .eq('id', attempt.id)
          return json({ error: 'Betalingen kunne ikke fullføres. Prøv igjen.' }, 502)
        }
      }

      await supabase
        .from('signups')
        .update({
          dintero_transaction_id: transactionId,
          dintero_session_id: attempt.dintero_session_id ?? null,
          dintero_merchant_reference: merchantReference,
          payment_product: transaction.payment_product ?? null,
          payment_status: 'paid',
          amount_paid: amountNok,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', attempt.existing_signup_id)

      await supabase
        .from('payment_attempts')
        .update({
          status: 'captured',
          dintero_transaction_id: transactionId,
          payment_product: transaction.payment_product ?? null,
        })
        .eq('id', attempt.id)

      await deliverBookingConfirmations(supabase, attempt.existing_signup_id, attempt, amountNok)

      return json({ signup_id: attempt.existing_signup_id, status: 'confirmed' } satisfies FinalizeResult, 200)
    }

    // Embedded flow: ticket-type-aware atomic capacity check via RPC.
    // The RPC handles per-session capacity for drop-ins, multi-session
    // capacity for packages, sales window re-check, and per-tier quota,
    // all serialised by an advisory lock keyed on (course, session) for
    // drop-ins or (course) for packages.
    if (!attempt.ticket_type_id) {
      // Should not happen post-2026-04-26: every new payment_attempts row is
      // created with a ticket_type_id. Defensive — refuse to fall through.
      return json({ error: 'attempt_missing_ticket_type' }, 500)
    }

    const { data: signupResult, error: signupRpcError } = await supabase.rpc('create_signup_if_available', {
      p_seller_id: attempt.seller_id,
      p_course_id: attempt.course_id,
      p_ticket_type_id: attempt.ticket_type_id,
      p_participant_name: attempt.participant_name,
      p_participant_email: attempt.participant_email,
      p_participant_phone: attempt.participant_phone,
      p_amount_paid: amountNok,
      p_dintero_transaction_id: transactionId,
      p_dintero_session_id: attempt.dintero_session_id,
      p_dintero_merchant_reference: merchantReference,
      p_course_session_id: attempt.course_session_id,
      p_note: attempt.note ?? null,
      p_payment_product: transaction.payment_product ?? null,
    })

    if (signupRpcError) {
      // Transport/DB error from the RPC — NOT a capacity reject. Do not void:
      // the authorization is still live and the webhook (or a client retry)
      // can still complete the signup. Return a retryable 503 so the caller
      // re-polls instead of treating a DB hiccup as a refused booking.
      console.error('finalize-dintero-transaction: create_signup_if_available RPC error', signupRpcError)
      return json(
        { error: 'signup_rpc_error', message: 'Kunne ikke fullføre påmeldingen. Prøv igjen.' },
        503,
      )
    }

    if (!signupResult || !signupResult.success) {
      // The RPC serializes same-transaction callers on an advisory lock and
      // short-circuits to success when the signup already exists, so any
      // failure here is a real reject: capacity loss, sales window expired,
      // tier sold out, or genuine duplicate booking (already_signed_up).
      // All warrant a void if the auth is still live.
      if (transaction.status === 'AUTHORIZED') {
        try {
          await voidTransaction(transactionId)
        } catch (_voidErr) {
          // Non-fatal
        }
      }
      await supabase
        .from('payment_attempts')
        .update({ status: 'voided' })
        .eq('id', attempt.id)

      return json(
        {
          error: signupResult?.error ?? 'signup_failed',
          message: signupResult?.message ?? 'Kunne ikke fullføre påmeldingen',
        },
        409,
      )
    }

    // Race-loser fast path: the RPC found an existing signup for this
    // transaction (the webhook won). Return it without re-capturing or
    // re-firing side effects — the winner already did both.
    if (signupResult.status === 'already_processed') {
      return json(
        { signup_id: signupResult.signup_id, status: 'already_processed' } satisfies FinalizeResult,
        200,
      )
    }

    // Capture (only if still AUTHORIZED — CAPTURED means someone already captured, just confirm).
    if (transaction.status === 'AUTHORIZED') {
      try {
        await captureIfAuthorized(transactionId, transaction.amount)
      } catch (err) {
        console.error('finalize-dintero-transaction: capture failed (embedded)', err)
        // AUDIT H2: the signup was created by this very transaction and the
        // buyer sees the payment-failed state — cancel it so it stops
        // consuming capacity and never reads as a confirmed unpaid booking.
        // (The payment-link branch keeps its pre-existing signup confirmed —
        // that booking predates the payment and the link can be retried.)
        await supabase
          .from('signups')
          .update({ payment_status: 'failed', status: 'cancelled' })
          .eq('id', signupResult.signup_id)
        await supabase
          .from('payment_attempts')
          .update({ status: 'failed' })
          .eq('id', attempt.id)
        return json({ error: 'Betalingen kunne ikke fullføres. Prøv igjen.', signup_id: signupResult.signup_id }, 502)
      }
    }

    await supabase
      .from('payment_attempts')
      .update({
        status: 'captured',
        dintero_transaction_id: transactionId,
        payment_product: transaction.payment_product ?? null,
      })
      .eq('id', attempt.id)

    await deliverBookingConfirmations(supabase, signupResult.signup_id, attempt, amountNok)

    return json({ signup_id: signupResult.signup_id, status: 'confirmed' } satisfies FinalizeResult, 200)
  } catch (err) {
    console.error('finalize-dintero-transaction error:', err)
    return json({ error: 'Noe gikk galt. Prøv igjen.' }, 500)
  }
})
