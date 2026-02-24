import { supabase } from '@/lib/supabase'

interface ConnectLinkResult {
  url: string
}

interface StripeStatusDetails {
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
}

interface StripeStatusResult {
  onboardingComplete: boolean
  details?: StripeStatusDetails
}

/**
 * Create a Stripe Connect onboarding link via Edge Function.
 * Returns a URL to redirect the teacher to Stripe's hosted onboarding.
 */
export async function createStripeConnectLink(
  organizationId: string
): Promise<{ data: ConnectLinkResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {
      body: { organizationId },
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to create Stripe Connect link') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as ConnectLinkResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Create a Stripe Express Dashboard login link via Edge Function.
 * Returns a one-time URL to redirect the teacher to their Stripe dashboard.
 */
export async function createStripeDashboardLink(
  organizationId: string
): Promise<{ data: ConnectLinkResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-stripe-login-link', {
      body: { organizationId },
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to create Stripe dashboard link') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as ConnectLinkResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Check the Stripe Connect account status via Edge Function.
 * Returns whether onboarding is complete, plus diagnostic details.
 */
export async function checkStripeStatus(
  organizationId: string
): Promise<{ data: StripeStatusResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('check-stripe-status', {
      body: { organizationId },
    })

    if (error) {
      return { data: null, error: new Error(error.message || 'Failed to check Stripe status') }
    }

    if (data?.error) {
      return { data: null, error: new Error(data.error) }
    }

    return { data: data as StripeStatusResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
