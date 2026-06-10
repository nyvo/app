import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { BillingPlanSections } from '@/pages/teacher/BillingPage'

/**
 * Dev preview for the Abonnement page states — renders the real
 * BillingPlanSections (not a mock) for Start, Pro active and Pro past_due,
 * so the design can be reviewed without a logged-in seller.
 */
export default function BillingPreview() {
  const noop = () => {}

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl space-y-16 px-4 py-10 sm:px-6">
        <PreviewState label="Start (gratis)">
          <BillingPlanSections
            plan={null}
            status={null}
            renewsAt={null}
            onUpgrade={noop}
            onManage={noop}
            checkoutLoading={false}
            portalLoading={false}
          />
        </PreviewState>

        <PreviewState label="Pro – aktiv">
          <BillingPlanSections
            plan="pro"
            status="active"
            renewsAt="10. juli 2026"
            onUpgrade={noop}
            onManage={noop}
            checkoutLoading={false}
            portalLoading={false}
          />
        </PreviewState>

        <PreviewState label="Pro – betaling feilet">
          <BillingPlanSections
            plan="pro"
            status="past_due"
            renewsAt={null}
            missingStripeCustomer
            onUpgrade={noop}
            onManage={noop}
            checkoutLoading={false}
            portalLoading={false}
          />
        </PreviewState>
      </div>
    </main>
  )
}

function PreviewState({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <Badge variant="neutral" size="sm" className="mb-6">
        {label}
      </Badge>
      {children}
    </section>
  )
}
