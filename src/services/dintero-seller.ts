import { supabase } from '@/lib/supabase'

export type DinteroOnboardingStatus =
  | 'PENDING'
  | 'WAITING_FOR_DECLARATION'
  | 'WAITING_FOR_SIGNATURE'
  | 'ACTIVE'
  | 'DECLINED'
  | 'TERMINATED'

interface CreateSellerParams {
  sellerId: string
  // organizationNumber here = the legal/Brønnøysund org-nr of the business
  // signing up. Has nothing to do with the renamed `organizations` table.
  organizationNumber: string
  sandboxAutoApprove?: boolean
}

interface CreateSellerResult {
  status: DinteroOnboardingStatus
  sellerId: string | null
  approvalId?: string
  contractUrl: string | null
  alreadyOnboarded?: boolean
  resumed?: boolean
}

interface SellerStatusResult {
  onboardingComplete: boolean
  status: DinteroOnboardingStatus | null
  sellerId?: string | null
  contractUrl?: string | null
}

export interface DinteroSettlementTransfer {
  id: string
  amount: number
  currency: string
  status: string
  arrival_date: string | null
}

export interface DinteroSettlementsResult {
  balance: {
    available: Array<{ amount: number; currency: string }>
    pending: Array<{ amount: number; currency: string }>
  }
  transfers: DinteroSettlementTransfer[]
  account: {
    charges_enabled: boolean
    payouts_enabled: boolean
    status: string
  }
  sandbox: boolean
  notice?: string
}

export async function createDinteroSeller(
  params: CreateSellerParams,
): Promise<{ data: CreateSellerResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-dintero-seller', { body: params })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke starte onboarding') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as CreateSellerResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}

export async function checkDinteroSellerStatus(
  sellerId: string,
): Promise<{ data: SellerStatusResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('check-dintero-seller-status', {
      body: { sellerId },
    })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke sjekke status') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as SellerStatusResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}

export async function getDinteroSettlements(
  sellerId: string,
): Promise<{ data: DinteroSettlementsResult | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-dintero-settlements', {
      body: { sellerId },
    })
    if (error) return { data: null, error: new Error(error.message || 'Kunne ikke hente utbetalinger') }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data: data as DinteroSettlementsResult, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Ukjent feil') }
  }
}
