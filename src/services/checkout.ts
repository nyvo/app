import { supabase } from '@/lib/supabase'

interface CreateSessionParams {
  courseId: string
  organizationSlug: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  isDropIn?: boolean
  sessionId?: string
  signupPackageId?: string
  packageWeeks?: number
}

interface DinteroSessionResult {
  sid: string
  url: string
  merchantReference: string
}

/**
 * Create a Dintero checkout session via edge function.
 * Returns the session id for the embedded checkout widget.
 */
export async function createDinteroSession(
  params: CreateSessionParams,
): Promise<{ data: DinteroSessionResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-dintero-session', {
      body: params,
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke opprette betaling') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as DinteroSessionResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
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
