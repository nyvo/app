// Client-driven finalizer for Dintero transactions in the embedded flow.
// Replaces reliance on async webhook delivery — the success page calls this
// endpoint after the iframe authorizes, and we deterministically finish the
// transaction server-side (capacity check → capture → signup → email).
//
// Idempotent. Safe to call multiple times. State machine:
//
//   transaction.status = AUTHORIZED
//     → create_signup_if_available
//         success → captureTransaction → status=captured, signup=confirmed
//         failure (capacity) → voidTransaction → status=voided
//   transaction.status = CAPTURED
//     → ensure signup exists (best-effort create; unique_violation is fine)
//   transaction.status = FAILED | DECLINED
//     → mark attempt failed, return error
//
// No auth required — the transaction_id + merchant_reference are the credential.
// Server verifies the transaction exists at Dintero and its merchant_reference
// matches our payment_attempt row, preventing forged calls.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  captureTransaction,
  getTransaction,
  voidTransaction,
  type DinteroTransaction,
} from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// CORS: reuse the shared helper so ALLOWED_ORIGIN handling matches every
// other edge function. Falls back to a safe default, never to '*'.
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || 'https://www.framio.no',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FinalizeRequest {
  transaction_id: string
  merchant_reference?: string
}

interface FinalizeResult {
  signup_id: string
  status: 'confirmed' | 'already_processed'
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    // Short-circuit: if a signup already exists for this transaction, return it.
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

    // Fetch the live transaction from Dintero (source of truth for status + merchant_ref).
    let transaction: DinteroTransaction
    try {
      transaction = await getTransaction(transactionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown'
      return json({ error: `Failed to load transaction: ${message}` }, 502)
    }

    const dinteroMerchantRef = transaction.merchant_reference ?? null

    if (!dinteroMerchantRef) {
      return json({ error: 'Transaction has no merchant_reference' }, 400)
    }

    // Client must attest to the same merchant_reference Dintero has on the transaction.
    if (merchantReference !== dinteroMerchantRef) {
      return json({ error: 'merchant_reference mismatch' }, 400)
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
          await captureTransaction(transactionId, transaction.amount)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'capture failed'
          await supabase
            .from('signups')
            .update({ payment_status: 'failed' })
            .eq('id', attempt.existing_signup_id)
          await supabase
            .from('payment_attempts')
            .update({ status: 'failed' })
            .eq('id', attempt.id)
          return json({ error: `capture_failed: ${message}` }, 502)
        }
      }

      await supabase
        .from('signups')
        .update({
          dintero_transaction_id: transactionId,
          dintero_session_id: attempt.dintero_session_id ?? null,
          dintero_merchant_reference: merchantReference,
          payment_status: 'paid',
          amount_paid: amountNok,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', attempt.existing_signup_id)

      await supabase
        .from('payment_attempts')
        .update({ status: 'captured', dintero_transaction_id: transactionId })
        .eq('id', attempt.id)

      await sendConfirmationEmail(
        supabase,
        attempt.course_id,
        attempt.organization_id,
        attempt.participant_email,
        attempt.class_date ?? null,
        attempt.class_time ?? null,
      )

      return json({ signup_id: attempt.existing_signup_id, status: 'confirmed' } satisfies FinalizeResult, 200)
    }

    // Embedded flow: atomic capacity check via RPC.
    const { data: signupResult } = await supabase.rpc('create_signup_if_available', {
      p_course_id: attempt.course_id,
      p_organization_id: attempt.organization_id,
      p_participant_name: attempt.participant_name,
      p_participant_email: attempt.participant_email,
      p_participant_phone: attempt.participant_phone,
      p_dintero_transaction_id: transactionId,
      p_dintero_session_id: attempt.dintero_session_id,
      p_dintero_merchant_reference: merchantReference,
      p_amount_paid: amountNok,
      p_is_drop_in: attempt.is_drop_in,
      p_class_date: attempt.class_date,
      p_class_time: attempt.class_time,
      p_signup_package_id: attempt.signup_package_id,
      p_package_weeks: attempt.package_weeks,
    })

    if (!signupResult || !signupResult.success) {
      // Race lost OR duplicate signup. If duplicate, the signup already exists
      // (already_signed_up); the short-circuit at the top should have caught it
      // but belt-and-braces: return the existing one if we can find it.
      if (signupResult?.error === 'already_signed_up') {
        const { data: existing } = await supabase
          .from('signups')
          .select('id')
          .eq('dintero_transaction_id', transactionId)
          .maybeSingle()
        if (existing) {
          return json({ signup_id: existing.id, status: 'already_processed' } satisfies FinalizeResult, 200)
        }
      }

      // Capacity loss → void (if still authorized).
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

    // Capture (only if still AUTHORIZED — CAPTURED means someone already captured, just confirm).
    if (transaction.status === 'AUTHORIZED') {
      try {
        await captureTransaction(transactionId, transaction.amount)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'capture failed'
        await supabase
          .from('signups')
          .update({ payment_status: 'failed' })
          .eq('id', signupResult.signup_id)
        await supabase
          .from('payment_attempts')
          .update({ status: 'failed' })
          .eq('id', attempt.id)
        return json({ error: `capture_failed: ${message}`, signup_id: signupResult.signup_id }, 502)
      }
    }

    await supabase
      .from('payment_attempts')
      .update({ status: 'captured', dintero_transaction_id: transactionId })
      .eq('id', attempt.id)

    await sendConfirmationEmail(
      supabase,
      attempt.course_id,
      attempt.organization_id,
      attempt.participant_email,
      attempt.class_date ?? null,
      attempt.class_time ?? null,
    )

    return json({ signup_id: signupResult.signup_id, status: 'confirmed' } satisfies FinalizeResult, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: message }, 500)
  }
})
