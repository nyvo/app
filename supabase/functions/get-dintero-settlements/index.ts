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
import { getAccountId, isSandbox, dinteroGet } from '../_shared/dintero.ts'
import { enqueueNotification } from '../_shared/notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

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

    // Best-effort: insert a notification for each completed transfer we've
    // never seen before. dedupe_key on (payout.sent, transfer.id) makes this
    // safely idempotent — subsequent page loads collapse to no-op. Limitation:
    // notifications only fire when the owner opens the payouts page. A proper
    // cron polling for new transfers would catch this independently of UI
    // activity; not added in v1 to keep scope contained.
    for (const t of transfers) {
      if (!t.id) continue
      const isCompleted = (t.status ?? '').toLowerCase().includes('paid') ||
        (t.status ?? '').toLowerCase().includes('completed') ||
        (t.status ?? '').toLowerCase().includes('settled')
      if (!isCompleted) continue
      const amountNok = (t.amount ?? 0) / 100
      if (amountNok <= 0) continue
      await enqueueNotification(supabase, {
        type: 'payout.sent',
        sellerId: body.organizationId,
        settlementId: t.id,
        amount: amountNok,
      })
    }

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
    console.error('get-dintero-settlements error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
