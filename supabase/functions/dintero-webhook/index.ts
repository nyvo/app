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
  captureTransaction,
  getTransaction,
  voidTransaction,
  verifyCallbackSignatureDetailed,
  signCallbackForTest,
  type DinteroTransaction,
} from '../_shared/dintero.ts'

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

async function sendConfirmationEmail(
  supabase: SupabaseClient,
  courseId: string,
  organizationId: string,
  participantEmail: string,
  classDate: string | null,
  classTime: string | null,
): Promise<void> {
  try {
    const [{ data: course }, { data: org }] = await Promise.all([
      supabase
        .from('courses')
        .select('title, location, time_schedule, start_date')
        .eq('id', courseId)
        .single(),
      supabase.from('organizations').select('name').eq('id', organizationId).single(),
    ])

    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }

    const extractTime = (schedule: string | null): string => {
      if (!schedule) return ''
      const match = schedule.match(/(\d{1,2}:\d{2})/)
      return match ? match[1] : ''
    }

    const emailDate = classDate || course?.start_date || null
    const emailTime = classTime || extractTime(course?.time_schedule ?? null)

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: participantEmail,
        template: 'signup-confirmation',
        templateData: {
          courseName: course?.title || 'Kurs',
          courseDate: formatDate(emailDate),
          courseTime: emailTime,
          location: course?.location || '',
          organizationName: org?.name || 'Ease',
        },
      }),
    })
  } catch (_err) {
    // Email failures are non-fatal
  }
}

async function sendBookingFailedEmail(
  supabase: SupabaseClient,
  courseId: string,
  participantEmail: string,
  errorType: string,
): Promise<void> {
  try {
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single()

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: participantEmail,
        template: 'booking-failed',
        templateData: {
          courseName: course?.title || 'Kurset',
          reason:
            errorType === 'course_full'
              ? 'Kurset ble dessverre fullt før vi kunne bekrefte din påmelding.'
              : errorType === 'already_signed_up'
                ? 'Du er allerede påmeldt dette kurset.'
                : 'Det oppstod en feil ved påmelding.',
          wasCharged: 'false',
        },
      }),
    })
  } catch (_err) {
    // Non-fatal
  }
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
  // webhook secret. Confirms the verify logic is internally consistent.
  // If this returns ok:true but real Dintero callbacks still fail, the
  // canonical string inputs (hostname/pathname/query/method) diverge
  // between what Dintero signs and what req.url gives us.
  if (url.searchParams.get('__selftest') === '1') {
    const testTimestamp = String(Math.floor(Date.now() / 1000))
    // Use the *reconstructed* public URL (https + /functions/v1/ prefix
    // restored), minus the selftest flag — so the canonical string
    // matches what a real Dintero callback would produce.
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
          rawReqUrl: req.url,
          signedUrl: testUrl.toString(),
          hostname: testUrl.hostname,
          pathname: testUrl.pathname,
          search: testUrl.search,
          timestamp: testTimestamp,
          secretConfigured: !!webhookSecret,
          accountIdConfigured: !!Deno.env.get('DINTERO_ACCOUNT_ID'),
        },
        diagnostics: roundtrip.ok ? undefined : {
          canonical: roundtrip.canonical,
          computedHex: roundtrip.computedHex,
          providedHex: roundtrip.providedHex,
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
    // Log the full diagnostics (sans secret). These are the exact bytes we
    // HMAC'd — diffing against Dintero's side is the way to find the
    // inevitable hostname/pathname/query-encoding drift.
    console.warn('dintero-webhook: signature rejected', {
      reason: sigResult.reason,
      timestamp: sigResult.timestamp,
      accountId: sigResult.accountId,
      method: sigResult.method,
      hostname: sigResult.hostname,
      pathname: sigResult.pathname,
      query: sigResult.query,
      canonical: sigResult.canonical,
      computedHex: sigResult.computedHex,
      providedHex: sigResult.providedHex,
      // Also log the raw req.url so we can see what Supabase's runtime gave us.
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
          .update({ dintero_transaction_id: transaction.id, status: 'authorized' })
          .eq('id', attempt.id)

        const amountNok = transaction.amount / 100

        // Payment-link flow: we have an existing signup — just update + capture
        if (attempt.existing_signup_id) {
          try {
            await captureTransaction(transaction.id, transaction.amount)
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

          await sendConfirmationEmail(
            supabase,
            attempt.course_id,
            attempt.organization_id,
            attempt.participant_email,
            attempt.class_date ?? null,
            attempt.class_time ?? null,
          )

          await markEventResult(supabase, transaction.id, status, {
            type: 'payment_link',
            signup_id: attempt.existing_signup_id,
            status: 'confirmed',
          })
          return new Response('OK', { status: 200 })
        }

        // Embedded flow: atomic capacity check + signup creation
        const { data: signupResult } = await supabase.rpc('create_signup_if_available', {
          p_course_id: attempt.course_id,
          p_organization_id: attempt.organization_id,
          p_participant_name: attempt.participant_name,
          p_participant_email: attempt.participant_email,
          p_participant_phone: attempt.participant_phone,
          p_dintero_transaction_id: transaction.id,
          p_dintero_session_id: attempt.dintero_session_id ?? payload.sessionId ?? null,
          p_dintero_merchant_reference: merchantReference,
          p_amount_paid: amountNok,
          p_is_drop_in: attempt.is_drop_in,
          p_class_date: attempt.class_date,
          p_class_time: attempt.class_time,
          p_signup_package_id: attempt.signup_package_id,
          p_package_weeks: attempt.package_weeks,
        })

        if (!signupResult || !signupResult.success) {
          const errorType = (signupResult && signupResult.error) || 'unknown'
          try {
            await voidTransaction(transaction.id)
          } catch (_voidErr) {
            // Non-fatal; mark attempt voided anyway
          }
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', attempt.id)

          await sendBookingFailedEmail(
            supabase,
            attempt.course_id,
            attempt.participant_email,
            errorType,
          )

          await markEventResult(supabase, transaction.id, status, {
            type: 'embedded',
            status: 'voided',
            error: errorType,
          })
          return new Response('OK', { status: 200 })
        }

        // Signup created — capture
        try {
          await captureTransaction(transaction.id, transaction.amount)
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

        await sendConfirmationEmail(
          supabase,
          attempt.course_id,
          attempt.organization_id,
          attempt.participant_email,
          attempt.class_date ?? null,
          attempt.class_time ?? null,
        )

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
        await supabase
          .from('signups')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            refund_amount: refundAmountNok,
            refunded_at: new Date().toISOString(),
          })
          .eq('dintero_transaction_id', transaction.id)
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
        // Payment-link flow may have an existing signup to mark as failed
        if (merchantReference) {
          const { data: attempt } = await supabase
            .from('payment_attempts')
            .select('existing_signup_id')
            .eq('id', merchantReference)
            .single()
          if (attempt?.existing_signup_id) {
            await supabase
              .from('signups')
              .update({ payment_status: 'failed' })
              .eq('id', attempt.existing_signup_id)
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
        if (merchantReference) {
          await supabase
            .from('payment_attempts')
            .update({ status: 'voided' })
            .eq('id', merchantReference)
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
