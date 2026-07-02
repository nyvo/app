import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/error-messages'

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
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { sellerId, ...extraBody },
    })
    // Server errors can be raw English strings (e.g. "Stripe price is not
    // configured"). Route them through friendlyError so anything unmapped
    // falls back to the Norwegian message instead of leaking to the toast.
    if (error) return { url: null, error: new Error(friendlyError(error, fallbackMessage)) }
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
