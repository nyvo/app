import { supabase } from '@/lib/supabase'

interface CreateCheckoutParams {
  courseId: string
  organizationSlug: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  isDropIn?: boolean
  sessionId?: string
  successUrl: string
  cancelUrl: string
}

interface CheckoutResult {
  sessionId: string
  url: string
}

/**
 * Create a Stripe checkout session via Edge Function.
 * Returns the session ID and redirect URL.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ data: CheckoutResult | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: params,
    })

    if (error) {
      return { data: null, error: error.message || 'Failed to create checkout session' }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return { data: data as CheckoutResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: message }
  }
}
