import type { ReactNode } from 'react'
import { ExternalLink } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/teacher/PageShell'
import { BillingPlanSections, subscriptionStatusLine } from '@/pages/teacher/BillingPage'

/**
 * Dev preview for the Abonnement page states. Renders the real PageShell +
 * BillingPlanSections (not a mock), so the page header pattern — title with an
 * inline "Administrer abonnement" action and the subscription status as the
 * description — can be reviewed alongside the plan cards without a logged-in
 * seller.
 */
export default function BillingPreview() {
  const noop = () => {}

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <PreviewState label="Start (gratis) — med Månedlig/Årlig">
          <BillingPagePreview
            plan={null}
            status={null}
            renewsAt={null}
            cancel={false}
            onUpgrade={noop}
            yearly={{ price: '416 kr', priceSub: '/mnd, fakturert årlig', savings: 'Spar 17 %' }}
          />
        </PreviewState>

        <PreviewState label="Pro – aktiv">
          <BillingPagePreview
            plan="pro"
            status="active"
            renewsAt="10. juli 2026"
            cancel={false}
            onUpgrade={noop}
          />
        </PreviewState>

        <PreviewState label="Pro – sies opp ved periodeslutt">
          <BillingPagePreview
            plan="pro"
            status="active"
            renewsAt="10. juli 2026"
            cancel
            onUpgrade={noop}
          />
        </PreviewState>

        <PreviewState label="Pro – betaling feilet">
          <BillingPagePreview
            plan="pro"
            status="past_due"
            renewsAt={null}
            cancel={false}
            onUpgrade={noop}
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

/**
 * Mirrors the real BillingPage composition: the subscription status renders as
 * the PageShell description and "Administrer abonnement" as the inline action
 * for Pro; free sellers get the plain header + plan cards.
 */
function BillingPagePreview({
  plan,
  status,
  renewsAt,
  cancel,
  onUpgrade,
  yearly,
}: {
  plan: string | null
  status: string | null
  renewsAt: string | null
  cancel: boolean
  onUpgrade: () => void
  yearly?: { price: string; priceSub: string; savings?: string }
}) {
  const isPro = plan === 'pro'
  const isPastDue = isPro && status === 'past_due'
  const statusLine = subscriptionStatusLine(status, renewsAt, cancel)

  return (
    <PageShell
      animate={false}
      narrow="centered"
      className="px-0 pb-0 pt-0 sm:px-0 lg:px-0 lg:pt-0 md:pb-0"
      title="Abonnement"
      description={isPro && !isPastDue ? statusLine : undefined}
      action={
        isPro ? (
          <Button type="button" variant="secondary" onClick={() => {}}>
            Administrer abonnement
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        ) : undefined
      }
    >
      <BillingPlanSections
        plan={plan}
        status={status}
        onUpgrade={onUpgrade}
        onManage={() => {}}
        checkoutLoading={false}
        portalLoading={false}
        yearly={yearly}
      />
    </PageShell>
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
  { label: 'Aktiv uten fornyelsesdato', status: 'active', renewsAt: null, cancel: false },
  { label: 'Sies opp — uten dato', status: 'active', renewsAt: null, cancel: true },
  { label: 'Ingen aktiv betaling', status: null, renewsAt: null, cancel: false },
]

function PreviewState({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-6">
      <Badge variant="neutral" size="sm" className="mb-6">
        {label}
      </Badge>
      {children}
    </section>
  )
}
