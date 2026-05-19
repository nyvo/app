// Cron-triggered sync of pending Dintero seller approval statuses.
// Dintero doesn't publish a seller-status-change webhook, so we poll.
//
// Trigger via Supabase scheduled function (every 5 min) or an external cron.
// Requires a service-role or cron-shared-secret header to invoke.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { listSellerApprovals } from '../_shared/dintero.ts'
import { enqueueNotification, type NotificationInput } from '../_shared/notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('DINTERO_CRON_SECRET') || ''

function notificationForStatus(
  caseStatus: string,
  sellerId: string,
): NotificationInput | null {
  switch (caseStatus) {
    case 'ACTIVE':
      return { type: 'dintero_seller.approved', sellerId }
    case 'REJECTED':
    case 'DECLINED':
      return { type: 'dintero_seller.rejected', sellerId }
    case 'WAITING_FOR_DECLARATION':
    case 'WAITING_FOR_SIGNATURE':
      return { type: 'dintero_seller.action_required', sellerId }
    default:
      return null
  }
}

Deno.serve(async (req: Request) => {
  // Require cron secret OR service role key
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = auth === `Bearer ${supabaseServiceKey}`
  const hasCronSecret = cronSecret && providedSecret === cronSecret

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: pendingSellers, error } = await supabase
      .from('sellers')
      .select('id, dintero_approval_id, dintero_onboarding_status')
      .in('dintero_onboarding_status', ['PENDING', 'WAITING_FOR_DECLARATION', 'WAITING_FOR_SIGNATURE'])

    if (error) {
      return new Response(`Failed to load sellers: ${error.message}`, { status: 500 })
    }

    if (!pendingSellers || pendingSellers.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // One list call — Dintero's filter-by-id is not universally documented, so fetch all and join in-memory.
    const approvals = await listSellerApprovals()
    const byId = new Map(approvals.map((a) => [a.id, a]))

    let synced = 0
    for (const seller of pendingSellers) {
      if (!seller.dintero_approval_id) continue
      const approval = byId.get(seller.dintero_approval_id)
      if (!approval) continue

      const caseStatus = approval.case_status
      if (caseStatus !== seller.dintero_onboarding_status) {
        await supabase
          .from('sellers')
          .update({
            dintero_onboarding_status: caseStatus,
            dintero_onboarding_complete: caseStatus === 'ACTIVE',
          })
          .eq('id', seller.id)

        // Fire a notification for the meaningful transitions. The dedupe_keys
        // make this idempotent: approved/rejected fire once per seller forever;
        // action_required uses a daily key so it re-surfaces each day the
        // seller leaves docs unhandled (intentional — keeps the amber dot
        // from going stale).
        const event = notificationForStatus(caseStatus, seller.id)
        if (event) await enqueueNotification(supabase, event)

        synced++
      }
    }

    return new Response(JSON.stringify({ synced, checked: pendingSellers.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    return new Response(`Sync error: ${message}`, { status: 500 })
  }
})
