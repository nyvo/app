// Fetch Dintero seller balance + recent transfers (payouts).
// Replaces get-stripe-balance.
//
// Dintero endpoints used (confirmed via @dintero/node-sdk types):
//   GET /v2/accounts/{aid}/payout/payout-destinations/{payout_destination_id}/balances
//   GET /v2/accounts/{aid}/payout/payout-destinations/{payout_destination_id}/transfers
//
// In sandbox these often return empty/404 — we degrade gracefully.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { getAccountId, isSandbox } from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const API_BASE = 'https://api.dintero.com'

interface BalanceRequest {
  /** Seller UUID. Kept the camelCase external name for client compatibility. */
  organizationId: string
}

interface DinteroBalanceResponse {
  balances?: Array<{ currency?: string; amount?: number; available_amount?: number }>
  pending?: Array<{ currency?: string; amount?: number }>
}

interface DinteroTransfer {
  id: string
  amount?: number
  currency?: string
  status?: string
  created_at?: string
  settlement_date?: string
  arrival_date?: string
}

async function dinteroGet<T>(path: string): Promise<T | null> {
  // We need the token — replicate the logic from _shared/dintero.ts
  // rather than importing getAccessToken (not exported) to keep this file focused.
  // Implementation: reuse via a small helper.
  const token = await getAccessTokenLocal()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dintero GET ${path} -> ${res.status}: ${text}`)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text) as T
}

async function getAccessTokenLocal(): Promise<string> {
  const accountId = getAccountId()
  const clientId = Deno.env.get('DINTERO_CLIENT_ID') || ''
  const clientSecret = Deno.env.get('DINTERO_CLIENT_SECRET') || ''
  const url = `${API_BASE}/v1/accounts/${accountId}/auth/token`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      audience: `${API_BASE}/v1/accounts/${accountId}`,
    }),
  })
  if (!res.ok) {
    throw new Error(`Dintero auth failed: ${res.status}`)
  }
  const payload = (await res.json()) as { access_token: string }
  return payload.access_token
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as BalanceRequest
    if (!body.organizationId) {
      return errorResponse('organizationId is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.organizationId, ['owner', 'admin'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Not authenticated', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Not authorized', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, dintero_seller_id, dintero_onboarding_complete, dintero_onboarding_status')
      .eq('id', body.organizationId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Seller not found', 404, req)
    }

    if (!seller.dintero_seller_id) {
      return errorResponse('Dintero seller not set up', 400, req)
    }

    if (!seller.dintero_onboarding_complete) {
      return successResponse({
        balance: { available: [], pending: [] },
        transfers: [],
        account: {
          charges_enabled: false,
          payouts_enabled: false,
          status: seller.dintero_onboarding_status || 'PENDING',
        },
        sandbox: isSandbox(),
        notice:
          'Utbetalinger er klare når Dintero har godkjent kontoen din. Gjelder vanligvis innen en virkedag.',
      }, 200, req)
    }

    const accountId = getAccountId()
    const sellerId = seller.dintero_seller_id

    const balancesPath = `/v2/accounts/${accountId}/payout/payout-destinations/${sellerId}/balances`
    const transfersPath = `/v2/accounts/${accountId}/payout/payout-destinations/${sellerId}/transfers?limit=10`

    const [balanceResult, transfersResult] = await Promise.allSettled([
      dinteroGet<DinteroBalanceResponse>(balancesPath),
      dinteroGet<{ transfers?: DinteroTransfer[] } | DinteroTransfer[]>(transfersPath),
    ])

    const balance: DinteroBalanceResponse | null =
      balanceResult.status === 'fulfilled' ? balanceResult.value : null
    const transfersRaw =
      transfersResult.status === 'fulfilled' ? transfersResult.value : null
    const transfers: DinteroTransfer[] = Array.isArray(transfersRaw)
      ? transfersRaw
      : transfersRaw?.transfers ?? []

    const available = (balance?.balances ?? []).map((b) => ({
      amount: b.available_amount ?? b.amount ?? 0,
      currency: b.currency ?? 'NOK',
    }))
    const pending = (balance?.pending ?? []).map((b) => ({
      amount: b.amount ?? 0,
      currency: b.currency ?? 'NOK',
    }))

    return successResponse({
      balance: { available, pending },
      transfers: transfers.map((t) => ({
        id: t.id,
        amount: t.amount ?? 0,
        currency: t.currency ?? 'NOK',
        status: t.status ?? 'unknown',
        arrival_date: t.arrival_date ?? t.settlement_date ?? t.created_at ?? null,
      })),
      account: {
        charges_enabled: true,
        payouts_enabled: true,
        status: seller.dintero_onboarding_status || 'ACTIVE',
      },
      sandbox: isSandbox(),
    }, 200, req)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
