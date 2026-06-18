import { supabase } from '@/lib/supabase'
import { extractEdgeError } from '@/lib/edge-errors'

interface CreateSessionParams {
  courseId: string
  organizationSlug: string
  /** Ticket type chosen on the booking page. Required. */
  ticketTypeId: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  customerNote?: string
  /** Required only when the picked ticket type is a drop-in. */
  sessionId?: string
}

interface DinteroSessionResult {
  sid: string
  url: string
  merchantReference: string
}

/**
 * Create a Dintero checkout session via edge function.
 * Returns the session id for the embedded checkout widget.
 *
 * `status` is the HTTP status when the function returned a non-2xx response
 * (e.g. 409 = duplicate signup, course full). 0 means no HTTP error (network
 * failure, etc.). Callers can branch on it to decide whether to surface the
 * error inline (expected validation rejection) or as a toast (unexpected).
 */
export async function createDinteroSession(
  params: CreateSessionParams,
): Promise<{ data: DinteroSessionResult | null; error: Error | null; status: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-dintero-session', {
      body: params,
    })

    if (error) {
      const { status, message } = await extractEdgeError(error)
      return {
        data: null,
        error: new Error(message || 'Kunne ikke opprette betaling'),
        status,
      }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error), status: 0 }
    }

    return { data: data as DinteroSessionResult, error: null, status: 200 }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Ukjent feil'),
      status: 0,
    }
  }
}

interface StripeSessionResult {
  /** PaymentIntent client secret — passed to Stripe Elements to confirm payment. */
  clientSecret: string
  paymentIntentId: string
  /** payment_attempts id (= metadata.attempt_id) — carried to the success page as ref. */
  attemptId: string
}

/**
 * Create a Stripe Connect checkout session (manual-capture PaymentIntent) via edge function.
 * Stripe counterpart to createDinteroSession — identical params + { data, error, status }
 * envelope (status drives inline-vs-toast handling: 409 = duplicate, other 4xx = validation).
 */
export async function createStripeSession(
  params: CreateSessionParams,
): Promise<{ data: StripeSessionResult | null; error: Error | null; status: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-stripe-connect-session', {
      body: params,
    })

    if (error) {
      const { status, message } = await extractEdgeError(error)
      return {
        data: null,
        error: new Error(message || 'Kunne ikke opprette betaling'),
        status,
      }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error), status: 0 }
    }

    return { data: data as StripeSessionResult, error: null, status: 200 }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Ukjent feil'),
      status: 0,
    }
  }
}

interface FinalizeResult {
  signup_id: string
  status: 'confirmed' | 'already_processed'
}

/**
 * Finalize a Dintero transaction from the client after the iframe authorizes.
 * Runs the capacity check + capture + signup creation server-side.
 * Idempotent — safe to call more than once.
 */
export async function finalizeDinteroTransaction(
  transactionId: string,
  merchantReference?: string | null,
): Promise<{ data: FinalizeResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('finalize-dintero-transaction', {
      body: {
        transaction_id: transactionId,
        merchant_reference: merchantReference ?? undefined,
      },
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke fullføre betaling') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as FinalizeResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}
