// Dintero session callback_url handler.
// Replaces stripe-webhook.
//
// Verifies HMAC-SHA256 signature on the Dintero-Signature header, then fetches
// the full transaction server-to-server to decide what to do.
//
// Statuses handled:
//   AUTHORIZED           → capacity check via create_signup_if_available, then capture or void
//   CAPTURED             → idempotent no-op if signup already paid
//   REFUNDED             → cancel signup + mark refunded
//   PARTIALLY_REFUNDED   → mark refunded, keep signup confirmed
//   AUTHORIZATION_VOIDED → no-op
//   FAILED / DECLINED    → mark payment_status=failed on existing signup (payment-link flow only)
//
// Idempotency: processed_webhook_events.event_id = `${transactionId}:${status}` — since
// Dintero's callback_url lacks a subscription-style event_delivery UUID, we synthesize
// a deterministic key from the state we're about to write.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  captureIfAuthorized,
  getTransaction,
  voidTransaction,
  verifyCallbackSignatureDetailed,
  signCallbackForTest,
  type DinteroTransaction,
} from '../_shared/dintero.ts'
import { enqueueNotification } from '../_shared/notifications.ts'
import { sendEmail } from '../_shared/email.ts'
import { formatKroner, formatNorwegianDate, shortBookingId } from '../_shared/format.ts'
import { deliverBookingConfirmations } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const webhookSecret = Deno.env.get('DINTERO_WEBHOOK_SECRET') || ''

interface CallbackPayload {
  transactionId: string | null
  merchantReference: string | null
  sessionId: string | null
  status: string | null
}

function extractFromUrl(url: URL): CallbackPayload {
  return {
    transactionId: url.searchParams.get('transaction_id'),
    merchantReference: url.searchParams.get('merchant_reference'),
    sessionId: url.searchParams.get('session_id'),
    status: url.searchParams.get('status'),
  }
}

interface CallbackBody {
  transaction?: { id?: string; status?: string; merchant_reference?: string; session_id?: string }
  event?: string
  merchant_reference?: string
  session_id?: string
}

function extractFromBody(body: CallbackBody): CallbackPayload {
  const tx = body.transaction
  return {
    transactionId: tx?.id ?? null,
    merchantReference: tx?.merchant_reference ?? body.merchant_reference ?? null,
    sessionId: tx?.session_id ?? body.session_id ?? null,
    status: tx?.status ?? null,
  }
}

async function claimEvent(
  supabase: SupabaseClient,
  transactionId: string,
  status: string,
): Promise<boolean> {
  const eventId = `${transactionId}:${status}`
  const { error } = await supabase
    .from('processed_webhook_events')
    .insert({ event_id: eventId, event_type: `dintero.${status}`, result: { status: 'processing' } })
  if (error) {
    if (error.code === '23505') return false
    // Other errors: log and allow processing to continue; downstream idempotency is safe.
    return true
  }
  return true
}

async function markEventResult(
  supabase: SupabaseClient,
  transactionId: string,
  status: string,
  result: Record<string, unknown>,
): Promise<void> {
  const eventId = `${transactionId}:${status}`
  await supabase
    .from('processed_webhook_events')
    .update({ result })
    .eq('event_id', eventId)
}

// Best-effort notification for payment failures that affect an actual signup.
// Skips embedded-flow authorization declines (no signup exists yet — declined
// cards aren't worth notifying about). Only fires when there's a signup at
// risk: capture failures or payment-link authorization declines.
async function notifyPaymentFailed(
  supabase: SupabaseClient,
  signupId: string,
  attempt: { seller_id: string; course_id: string; participant_name: string | null },
  transactionId: string,
  amountNok: number,
): Promise<void> {
  if (!attempt.participant_name) return
  await enqueueNotification(supabase, {
    type: 'payment.failed',
    sellerId: attempt.seller_id,
    signupId,
    courseId: attempt.course_id,
    transactionId,
    buyerName: attempt.participant_name,
    amount: amountNok,
  })
}

/**
 * Supabase's edge runtime rewrites the request URL before handing it to
 * the function — the `/functions/v1/` prefix is stripped. But Dintero
 * signs its callback against the **public** URL it called (which includes
 * the prefix). Reconstruct the public URL so our canonical string matches
 * Dintero's.
 *
 * E.g. req.url = `http://nollnnkksgicsvuthnjq.supabase.co/dintero-webhook?x=1`
 *   →  public = `https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/dintero-webhook?x=1`
 *
 * The scheme is also forced back to https — req.url shows http because the
 * edge runtime sits behind the TLS-terminating proxy.
 */
function publicCallbackUrl(reqUrl: string): URL {
  const raw = new URL(reqUrl)
  const pathname = raw.pathname.startsWith('/functions/v1/')
    ? raw.pathname
    : `/functions/v1${raw.pathname}`
  return new URL(`https://${raw.host}${pathname}${raw.search}`)
}

Deno.serve(async (req: Request) => {
  const url = publicCallbackUrl(req.url)

  // Diagnostics endpoint: round-trip sign+verify using the real deployed
  // webhook secret. Gated by SELFTEST_TOKEN env var — set it when you
  // want to exercise the endpoint, unset it when done. Callers must pass
  // `?__selftest=<token>` (not just `1`). Response is intentionally
  // minimal — only the inputs that help diagnose URL-reconstruction
  // drift. No hex digests or canonical strings are ever returned.
  const selftestParam = url.searchParams.get('__selftest')
  if (selftestParam) {
    const selftestToken = Deno.env.get('SELFTEST_TOKEN') || ''
    if (!selftestToken || selftestParam !== selftestToken) {
      return new Response('Not found', { status: 404 })
    }

    const testTimestamp = String(Math.floor(Date.now() / 1000))
    const testUrl = new URL(url.toString())
    testUrl.searchParams.delete('__selftest')
    const header = await signCallbackForTest({
      method: 'POST',
      url: testUrl,
      timestamp: testTimestamp,
      secret: webhookSecret,
    })
    const roundtrip = await verifyCallbackSignatureDetailed({
      method: 'POST',
      url: testUrl,
      header,
      secret: webhookSecret,
    })
    return new Response(
      JSON.stringify({
        roundtrip_ok: roundtrip.ok,
        reason: roundtrip.reason,
        inputs: {
          signedUrl: testUrl.toString(),
          hostname: testUrl.hostname,
          pathname: testUrl.pathname,
        },
      }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const signatureHeader = req.headers.get('dintero-signature') || req.headers.get('Dintero-Signature')

  if (!signatureHeader) {
    return new Response('Missing Dintero-Signature header', { status: 400 })
  }

  const sigResult = await verifyCallbackSignatureDetailed({
    method: req.method,
    url,
    header: signatureHeader,
    secret: webhookSecret,
  })
  if (!sigResult.ok) {
    // Log only enough to diagnose URL drift. No canonical string, no hex
    // digests — both are useful only to someone who also has the secret
    // (which Dintero + Supabase already do). Keeping logs terse prevents
    // anyone with dashboard access from reverse-engineering the signing
    // surface without the secret.
    console.warn('dintero-webhook: signature rejected', {
      reason: sigResult.reason,
      timestamp: sigResult.timestamp,
      method: sigResult.method,
      hostname: sigResult.hostname,
      pathname: sigResult.pathname,
      rawReqUrl: req.url,
    })
    return new Response('Invalid signature', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Gather payload from query (GET) and/or body (POST)
  let payload = extractFromUrl(url)
  if (req.method !== 'GET') {
    try {
      const text = await req.text()
      if (text) {
        const body = JSON.parse(text) as CallbackBody
        const fromBody = extractFromBody(body)
        payload = {
          transactionId: payload.transactionId ?? fromBody.transactionId,
          merchantReference: payload.merchantReference ?? fromBody.merchantReference,
          sessionId: payload.sessionId ?? fromBody.sessionId,
          status: payload.status ?? fromBody.status,
        }
      }
    } catch {
      // Body parsing failure — fall back to URL-only
    }
  }

  if (!payload.transactionId) {
    return new Response('Missing transaction_id', { status: 400 })
  }

  // Re-fetch the transaction server-to-server for a trustworthy view
  let transaction: DinteroTransaction
  try {
    transaction = await getTransaction(payload.transactionId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    return new Response(`Failed to load transaction: ${message}`, { status: 500 })
  }

  const status = transaction.status
  const merchantReference = payload.merchantReference || transaction.merchant_reference || null

  const claimed = await claimEvent(supabase, transaction.id, status)
  if (!claimed) {
    return new Response(JSON.stringify({ status: 'already_processed' }), { status: 200 })
  }

  try {
    switch (status) {
      case 'AUTHORIZED': {
        if (!merchantReference) {
          await markEventResult(supabase, transaction.id, status, {
            error: 'missing_merchant_reference',
          })
          return new Response('Missing merchant_reference', { status: 400 })
        }

        const { data: attempt } = await supabase
          .from('payment_attempts')
          .select('*')
          .eq('id', merchantReference)
          .single()

        if (!attempt) {
          await markEventResult(supabase, transaction.id, status, {
            error: 'payment_attempt_not_found',
            merchant_reference: merchantReference,
          })
          return new Response('Payment attempt not found', { status: 404 })
        }

        // Persist the Dintero transaction id on the attempt
        await supabase
          .from('payment_attempts')
          .update({
            dintero_transaction_id: transaction.id,
            status: 'authorized',
            payment_product: transaction.payment_product ?? null,
          })
          .eq('id', attempt.id)

        const amountNok = transaction.amount / 100

        // Payment-link flow: we have an existing signup — just update + capture
        if (attempt.existing_signup_id) {
          try {
            await captureIfAuthorized(transaction.id, transaction.amount)
          } catch (captureErr) {
            const message = captureErr instanceof Error ? captureErr.message : 'Unknown'
            await supabase
              .from('signups')
              .update({ payment_status: 'failed' })
              .eq('id', attempt.existing_signup_id)
            await supabase
              .from('payment_attempts')
              .update({ status: 'failed' })
              .eq('id', attempt.id)
            await notifyPaymentFailed(
              supabase,
              attempt.existing_signup_id,
              attempt,
              transaction.id,
              amountNok,
            )
            await markEventResult(supabase, transaction.id, status, {
              type: 'payment_link',
              error: 'capture_failed',
              message,
            })
            return new Response('OK', { status: 200 })
          }

          await supabase
            .from('signups')
            .update({
              dintero_transaction_id: transaction.id,
              dintero_session_id: attempt.dintero_session_id ?? payload.sessionId ?? null,
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
            .update({ status: 'captured' })
            .eq('id', attempt.id)

          await deliverBookingConfirmations(supabase, attempt.existing_signup_id, attempt, amountNok)

          await markEventResult(supabase, transaction.id, status, {
            type: 'payment_link',
            signup_id: attempt.existing_signup_id,
            status: 'confirmed',
          })
          return new Response('OK', { status: 200 })
        }

        // Embedded flow: ticket-type-aware atomic capacity check + signup creation.
        // Defensive: every payment_attempts row created post-2026-04-26 has a
        // ticket_type_id. If we somehow get a malformed attempt, void rather
        // than fall through to a broken RPC call.
        if (!attempt.ticket_type_id) {
          try { await voidTransaction(transaction.id) } catch (_e) { /* non-fatal */ }
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', attempt.id)
          await markEventResult(supabase, transaction.id, status, {
            type: 'embedded',
            error: 'attempt_missing_ticket_type',
          })
          return new Response('OK', { status: 200 })
        }

        const { data: signupResult } = await supabase.rpc('create_signup_if_available', {
          p_seller_id: attempt.seller_id,
          p_course_id: attempt.course_id,
          p_ticket_type_id: attempt.ticket_type_id,
          p_participant_name: attempt.participant_name,
          p_participant_email: attempt.participant_email,
          p_participant_phone: attempt.participant_phone,
          p_amount_paid: amountNok,
          p_dintero_transaction_id: transaction.id,
          p_dintero_session_id: attempt.dintero_session_id ?? payload.sessionId ?? null,
          p_dintero_merchant_reference: merchantReference,
          p_course_session_id: attempt.course_session_id,
          p_note: attempt.note ?? null,
          p_payment_product: transaction.payment_product ?? null,
        })

        if (!signupResult || !signupResult.success) {
          const errorType = (signupResult && signupResult.error) || 'unknown'

          // The RPC serializes same-transaction callers on an advisory lock
          // and short-circuits to success when the signup already exists, so
          // 'already_signed_up' now means exactly one thing: the buyer has a
          // confirmed non-drop-in signup for this course already. Void.
          try {
            await voidTransaction(transaction.id)
          } catch (_voidErr) {
            // Non-fatal; mark attempt voided anyway
          }
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', attempt.id)

          await markEventResult(supabase, transaction.id, status, {
            type: 'embedded',
            status: 'voided',
            error: errorType,
          })
          return new Response('OK', { status: 200 })
        }

        // Race-loser fast path: the RPC found an existing signup for this
        // transaction (the other path won). The winner has already captured
        // and fired side effects — exit without re-doing the work.
        if (signupResult.status === 'already_processed') {
          await markEventResult(supabase, transaction.id, status, {
            type: 'embedded',
            signup_id: signupResult.signup_id,
            status: 'already_processed',
          })
          return new Response('OK', { status: 200 })
        }

        // Signup created — capture
        try {
          await captureIfAuthorized(transaction.id, transaction.amount)
        } catch (captureErr) {
          const message = captureErr instanceof Error ? captureErr.message : 'Unknown'
          await supabase
            .from('signups')
            .update({ payment_status: 'failed' })
            .eq('id', signupResult.signup_id)
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed' })
            .eq('id', attempt.id)
          await notifyPaymentFailed(
            supabase,
            signupResult.signup_id,
            attempt,
            transaction.id,
            amountNok,
          )
          await markEventResult(supabase, transaction.id, status, {
            type: 'embedded',
            signup_id: signupResult.signup_id,
            status: 'capture_failed',
            error: message,
          })
          return new Response('OK', { status: 200 })
        }

        await supabase
          .from('payment_attempts')
          .update({ status: 'captured' })
          .eq('id', attempt.id)

        await deliverBookingConfirmations(supabase, signupResult.signup_id, attempt, amountNok)

        await markEventResult(supabase, transaction.id, status, {
          type: 'embedded',
          signup_id: signupResult.signup_id,
          status: 'confirmed',
        })
        return new Response('OK', { status: 200 })
      }

      case 'CAPTURED': {
        // Idempotent follow-up — our capture call likely triggered this. No-op.
        await markEventResult(supabase, transaction.id, status, { type: 'captured_echo' })
        return new Response('OK', { status: 200 })
      }

      case 'REFUNDED': {
        const refundAmountNok = transaction.amount / 100

        // Read current state BEFORE the update. If refunded_at is already set,
        // this webhook is the echo of an app-initiated refund (the owner used
        // cancel-course or teacher-cancel-signup, which set refunded_at first).
        // Skip the notification — owners don't get notified about their own
        // actions. If refunded_at is null, the refund originated outside the
        // app (Dintero compliance reversal, dispute resolution) and is worth
        // surfacing.
        const { data: signupBefore } = await supabase
          .from('signups')
          .select('id, seller_id, course_id, participant_name, participant_email, refunded_at, cancelled_at')
          .eq('dintero_transaction_id', transaction.id)
          .maybeSingle()

        const wasAppInitiated = !!signupBefore?.refunded_at

        await supabase
          .from('signups')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            // App-initiated refund: signup is already cancelled with its
            // original cancelled_at — preserve it. Dintero-initiated refund
            // (compliance reversal): no prior cancellation, stamp now.
            cancelled_at: signupBefore?.cancelled_at ?? new Date().toISOString(),
            refund_amount: refundAmountNok,
            refunded_at: new Date().toISOString(),
          })
          .eq('dintero_transaction_id', transaction.id)

        if (signupBefore && !wasAppInitiated && signupBefore.participant_name) {
          await enqueueNotification(supabase, {
            type: 'refund.completed',
            sellerId: signupBefore.seller_id,
            signupId: signupBefore.id,
            courseId: signupBefore.course_id,
            // Synthetic refund key — stable per (transaction, amount) so
            // webhook retries dedupe but distinct partial refunds don't.
            refundId: `${transaction.id}:${transaction.amount}`,
            buyerName: signupBefore.participant_name,
            amount: refundAmountNok,
          })
        }

        // Buyer always gets a refund-receipt email, regardless of who
        // initiated. The webhook is the canonical "money has actually moved"
        // event — firing on the request side would email before the refund
        // is real. Best-effort: errors logged, never block the webhook ack.
        if (signupBefore?.participant_email && signupBefore.participant_name) {
          const [{ data: course }, { data: seller }] = await Promise.all([
            supabase
              .from('courses')
              .select('title')
              .eq('id', signupBefore.course_id)
              .maybeSingle(),
            supabase
              .from('sellers')
              .select('name')
              .eq('id', signupBefore.seller_id)
              .maybeSingle(),
          ])
          if (course?.title && seller?.name) {
            const result = await sendEmail({
              template: 'refund-receipt',
              to: signupBefore.participant_email,
              props: {
                buyerName: signupBefore.participant_name,
                studioName: seller.name,
                courseTitle: course.title,
                amount: formatKroner(refundAmountNok),
                refundDate: formatNorwegianDate(new Date()),
                bookingId: shortBookingId(signupBefore.id),
              },
            })
            if (result.error) {
              console.error('[refund-receipt email] send failed', {
                signupId: signupBefore.id,
                to: signupBefore.participant_email,
                error: result.error,
              })
            }
          }
        }

        await markEventResult(supabase, transaction.id, status, { type: 'refund_full' })
        return new Response('OK', { status: 200 })
      }

      case 'PARTIALLY_REFUNDED': {
        const refundAmountNok = transaction.amount / 100
        await supabase
          .from('signups')
          .update({
            payment_status: 'refunded',
            refund_amount: refundAmountNok,
            refunded_at: new Date().toISOString(),
          })
          .eq('dintero_transaction_id', transaction.id)
        await markEventResult(supabase, transaction.id, status, { type: 'refund_partial' })
        return new Response('OK', { status: 200 })
      }

      case 'FAILED':
      case 'DECLINED': {
        // Payment-link flow may have an existing signup to mark as failed.
        // Embedded-flow declines never reach a signup so we don't notify
        // those — declined cards are normal customer experience, not
        // money-at-risk for the studio.
        if (merchantReference) {
          const { data: attempt } = await supabase
            .from('payment_attempts')
            .select('existing_signup_id, seller_id, course_id, participant_name')
            .eq('id', merchantReference)
            .single()
          if (attempt?.existing_signup_id) {
            await supabase
              .from('signups')
              .update({ payment_status: 'failed' })
              .eq('id', attempt.existing_signup_id)
            await notifyPaymentFailed(
              supabase,
              attempt.existing_signup_id,
              attempt,
              transaction.id,
              transaction.amount / 100,
            )
          }
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed' })
            .eq('id', merchantReference)
        }
        await markEventResult(supabase, transaction.id, status, { type: 'payment_failed' })
        return new Response('OK', { status: 200 })
      }

      case 'AUTHORIZATION_VOIDED': {
        // Guard against a stale/duplicate VOIDED webhook flipping a captured
        // attempt's status back to 'voided' — only transition from non-terminal
        // states (pending/authorized). Captured/failed/refunded rows are kept
        // intact; this is purely defensive against out-of-order delivery.
        if (merchantReference) {
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', merchantReference)
            .in('status', ['pending', 'authorized'])
        }
        await markEventResult(supabase, transaction.id, status, { type: 'voided' })
        return new Response('OK', { status: 200 })
      }

      default: {
        await markEventResult(supabase, transaction.id, status, { type: 'unhandled', status })
        return new Response('OK', { status: 200 })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    // Return 500 so Dintero retries on transient errors
    return new Response(`Webhook Error: ${message}`, { status: 500 })
  }
})
