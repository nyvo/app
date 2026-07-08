import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/error-messages'
import { extractEdgeError } from '@/lib/edge-errors'
import { withTimeout } from '@/lib/with-timeout'

interface BillingSessionResult {
  url: string
}

async function invokeBillingFunction(
  functionName: string,
  sellerId: string,
  fallbackMessage: string,
  extraBody?: Record<string, unknown>,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Cap the wait so a hung edge function surfaces an error instead of a
    // checkout button that spins forever.
    const { data, error } = await withTimeout(
      supabase.functions.invoke(functionName, {
        body: { sellerId, ...extraBody },
      }),
      15000,
      'Dette tok for lang tid. Prøv igjen.',
    )
    // invoke() wraps a non-2xx as a generic FunctionsHttpError; the real body
    // (e.g. { error: 'Studioet har allerede Pro.' }) is only readable via the
    // helper. Prefer that server message verbatim — the edge functions return
    // display-ready Norwegian — but only when it came from an HTTP body
    // (status set). Network/no-body errors go through friendlyError so a raw
    // "Failed to fetch" never reaches the toast.
    if (error) {
      const { status, message } = await extractEdgeError(error)
      const display = status !== 0 && message ? message : friendlyError(error, fallbackMessage)
      return { url: null, error: new Error(display) }
    }
    if (data?.error) return { url: null, error: new Error(friendlyError(data.error, fallbackMessage)) }
    const result = data as BillingSessionResult
    return { url: result.url, error: null }
  } catch (err) {
    return {
      url: null,
      error: new Error(friendlyError(err, fallbackMessage)),
    }
  }
}

export function createStripeCheckoutSession(
  sellerId: string,
  interval: 'month' | 'year' = 'month',
) {
  return invokeBillingFunction(
    'create-stripe-checkout-session',
    sellerId,
    'Kunne ikke starte abonnement.',
    { interval },
  )
}

export function createStripePortalSession(sellerId: string) {
  return invokeBillingFunction(
    'create-stripe-portal-session',
    sellerId,
    'Kunne ikke åpne fakturering.',
  )
}
