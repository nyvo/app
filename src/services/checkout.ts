import { supabase } from '@/lib/supabase'

interface CreateCheckoutParams {
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

interface CheckoutResult {
  sessionId: string
  url: string
}

interface PaymentIntentResult {
  clientSecret: string
  paymentIntentId: string
}

/**
 * Create a Stripe checkout session via Edge Function.
 * Returns the session ID and redirect URL.
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ data: CheckoutResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: params,
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke opprette betalingsøkt') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as CheckoutResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}

/**
 * Create a Stripe PaymentIntent via Edge Function for embedded payment.
 * Returns the client secret for the Payment Element.
 */
export async function createPaymentIntent(
  params: CreateCheckoutParams
): Promise<{ data: PaymentIntentResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: params,
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Kunne ikke opprette betaling') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as PaymentIntentResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}
