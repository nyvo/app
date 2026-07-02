import { supabase } from '@/lib/supabase'

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
    if (error) return { url: null, error: new Error(error.message || fallbackMessage) }
    if (data?.error) return { url: null, error: new Error(data.error) }
    const result = data as BillingSessionResult
    return { url: result.url, error: null }
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err : new Error(fallbackMessage),
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
