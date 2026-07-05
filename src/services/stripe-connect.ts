import { supabase } from '@/lib/supabase'

export type StripeAccountStatus = 'pending' | 'enabled' | 'restricted' | 'rejected'

interface StartOnboardingResult {
  url: string
}

interface ConnectStatusResult {
  status: string
  onboarding_complete: boolean
  requirements_due?: string[]
}

export interface StripeSettlementMoney {
  amount: number
  currency: string
}

export interface StripeSettlementPayout {
  id: string
  amount: number
  currency: string
  status: string
  arrival_date: number
  created: number
}

export interface StripeSettlementsResult {
  balance: {
    available: StripeSettlementMoney[]
    pending: StripeSettlementMoney[]
  }
  payouts: StripeSettlementPayout[]
  dashboardUrl: string | null
}

export async function startStripeConnectOnboarding(sellerId: string): Promise<{
  data: StartOnboardingResult | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase.functions.invoke('create-stripe-connect-account', {
      body: { sellerId },
    })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke starte betalingsoppsettet') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as StartOnboardingResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}

export async function refreshStripeConnectStatus(sellerId: string): Promise<{
  data: ConnectStatusResult | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase.functions.invoke('check-stripe-connect-status', {
      body: { sellerId },
    })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke sjekke status') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as ConnectStatusResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}

export async function getStripeSettlements(sellerId: string): Promise<{
  data: StripeSettlementsResult | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase.functions.invoke('get-stripe-settlements', {
      body: { sellerId },
    })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke hente utbetalinger') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as StripeSettlementsResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}
