import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { BillingPlanSections, subscriptionStatusLine } from '@/pages/teacher/BillingPage'

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
        <PreviewState label="Start (gratis) — med Månedlig/Årlig">
          <BillingPlanSections
            plan={null}
            status={null}
            renewsAt={null}
            yearly={{
              price: '416 kr',
              priceSub: '/mnd, fakturert årlig',
            }}
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

        <PreviewState label="Pro – sies opp ved periodeslutt">
          <BillingPlanSections
            plan="pro"
            status="active"
            renewsAt="10. juli 2026"
            cancelAtPeriodEnd
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
            onUpgrade={noop}
            onManage={noop}
            checkoutLoading={false}
            portalLoading={false}
          />
        </PreviewState>

        <PreviewState label="Statuslinje — alle varianter (kontrollsjekk)">
          <div className="divide-y divide-border-subtle rounded-xl border border-border bg-surface px-5">
            {STATUS_VARIANTS.map((v) => (
              <div key={v.label} className="flex flex-col gap-0.5 py-3">
                <span className="text-xs font-medium text-foreground">{v.label}</span>
                <span className="text-sm text-foreground-muted">
                  {subscriptionStatusLine(v.status, v.renewsAt, v.cancel)}
                </span>
              </div>
            ))}
          </div>
        </PreviewState>
      </div>
    </main>
  )
}

const STATUS_VARIANTS: {
  label: string
  status: string | null
  renewsAt: string | null
  cancel: boolean
}[] = [
  { label: 'Aktiv — fornyes automatisk', status: 'active', renewsAt: '10. juli 2026', cancel: false },
  { label: 'Sies opp ved periodeslutt', status: 'active', renewsAt: '10. juli 2026', cancel: true },
  { label: 'Betaling feilet (past_due)', status: 'past_due', renewsAt: null, cancel: false },
  { label: 'Aktiv uten fornyelsesdato', status: 'active', renewsAt: null, cancel: false },
  { label: 'Sies opp — uten dato', status: 'active', renewsAt: null, cancel: true },
  { label: 'Ingen aktiv betaling', status: null, renewsAt: null, cancel: false },
]

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
