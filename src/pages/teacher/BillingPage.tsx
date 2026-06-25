import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { PageShell } from '@/components/teacher/PageShell'
import { SettingsSection } from '@/components/teacher/SettingsSection'
import { useAuth } from '@/contexts/AuthContext'
import { formatKroner } from '@/lib/utils'
import { createStripeCheckoutSession, createStripePortalSession } from '@/services/billing'
import { toast } from 'sonner'

type SubscriptionPlan = string | null | undefined
type SubscriptionStatus = string | null | undefined

function planLabel(plan: SubscriptionPlan): string {
  return plan === 'pro' ? 'Pro' : 'Start'
}

function proStatusLine(status: SubscriptionStatus, renewsAt: string | null): string {
  if (status === 'past_due') return 'Betaling krever oppfølging'
  if (status === 'canceled') return 'Avsluttet'
  if (status === 'active') return renewsAt ? `Aktiv · Fornyes ${renewsAt}` : 'Aktiv'
  return 'Ingen aktiv betaling'
}

function formatBillingDate(value: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

const START_FEATURES = [
  'Påmeldinger og kurslenker',
  'Betaling avtales direkte med deltakerne',
  'Ingen betalingsoppsett nødvendig',
] as const

const PRO_FEATURES = [
  'Alt i Start',
  'Kortbetaling og Vipps i checkout',
  'Automatiske utbetalinger via Stripe',
  'Servicegebyr håndteres av plattformen',
] as const

const BillingPage = () => {
  const { currentSeller, refreshSellers } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const isPro = currentSeller?.subscription_plan === 'pro'
  const hasStripeCustomer = !!currentSeller?.subscription_customer_id
  const renewsAt = currentSeller?.subscription_current_period_end
    ? formatBillingDate(currentSeller.subscription_current_period_end)
    : null

  useEffect(() => {
    const stripeResult = searchParams.get('stripe')
    if (!stripeResult) return

    if (stripeResult === 'success') {
      toast.success('Abonnementet er aktivert')
      void refreshSellers()
    } else if (stripeResult === 'cancelled') {
      toast('Abonnementet ble ikke fullført')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('stripe')
    setSearchParams(next, { replace: true })
  }, [refreshSellers, searchParams, setSearchParams])

  const handleUpgrade = useCallback(async () => {
    if (!currentSeller?.id) return
    setCheckoutLoading(true)
    const { url, error } = await createStripeCheckoutSession(currentSeller.id)
    setCheckoutLoading(false)
    if (error || !url) {
      toast.error(error?.message || 'Kunne ikke starte abonnement.')
      return
    }
    window.location.assign(url)
  }, [currentSeller?.id])

  const handleManage = useCallback(async () => {
    if (!currentSeller?.id) return
    setPortalLoading(true)
    const { url, error } = await createStripePortalSession(currentSeller.id)
    setPortalLoading(false)
    if (error || !url) {
      toast.error(error?.message || 'Kunne ikke åpne fakturering.')
      return
    }
    window.location.assign(url)
  }, [currentSeller?.id])

  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-background">
      <MobileTeacherHeader />

      <PageShell narrow="centered" title="Abonnement">
        <BillingPlanSections
          plan={currentSeller?.subscription_plan}
          status={currentSeller?.subscription_status}
          renewsAt={renewsAt}
          missingStripeCustomer={isPro && !hasStripeCustomer}
          onUpgrade={handleUpgrade}
          onManage={handleManage}
          checkoutLoading={checkoutLoading}
          portalLoading={portalLoading}
        />
      </PageShell>
    </main>
  )
}

/**
 * Presentational plan UI — current-plan summary + Start/Pro comparison.
 * Exported so /dev/billing-preview can render the states without auth.
 */
export function BillingPlanSections({
  plan,
  status,
  renewsAt,
  missingStripeCustomer,
  onUpgrade,
  onManage,
  checkoutLoading,
  portalLoading,
}: {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  renewsAt: string | null
  missingStripeCustomer?: boolean
  onUpgrade: () => void
  onManage: () => void
  checkoutLoading: boolean
  portalLoading: boolean
}) {
  const isPro = plan === 'pro'
  const needsAttention = isPro && status === 'past_due'

  return (
    <div className="space-y-10">
      <SettingsSection title="Plan">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-foreground">{planLabel(plan)}</p>
                  {!isPro && (
                    <Badge variant="neutral" size="sm">
                      Gratis
                    </Badge>
                  )}
                </div>
                <p
                  className={
                    needsAttention
                      ? 'mt-1 text-sm font-medium text-warning'
                      : 'mt-1 text-sm text-foreground-muted'
                  }
                >
                  {isPro
                    ? proStatusLine(status, renewsAt)
                    : 'Kontoen tar imot påmeldinger. Betaling avtaler du direkte med deltakerne.'}
                </p>
              </div>
              {isPro && (
                <Button
                  type="button"
                  variant="default"
                  className="shrink-0"
                  onClick={onManage}
                  loading={portalLoading}
                  loadingText="Åpner"
                >
                  Administrer abonnement
                  <ExternalLink className="size-4" aria-hidden />
                </Button>
              )}
            </div>

            {!isPro && (
              <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground-muted">
                  Få betalt automatisk med kort og Vipps i checkout.
                </p>
                <Button
                  type="button"
                  variant="default"
                  className="shrink-0"
                  onClick={onUpgrade}
                  loading={checkoutLoading}
                  loadingText="Åpner"
                >
                  Oppgrader til Pro
                </Button>
              </div>
            )}

            {missingStripeCustomer && (
              <p className="border-t border-border-subtle pt-4 text-sm text-foreground-muted">
                Abonnementet er aktivt, men mangler Stripe-kunde. Kontakt support for fakturering.
              </p>
            )}
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection title="Velg plan">
        <div className="grid gap-4 md:grid-cols-2">
          <PlanOption
            name="Start"
            price="Gratis"
            description="For instruktører som vil ta påmeldinger og håndtere betaling selv."
            features={START_FEATURES}
            active={!isPro}
          />
          <PlanOption
            name="Pro"
            price={`Fra ${formatKroner(499)}`}
            priceSub="/mnd eks. mva"
            description="For instruktører og studioer som vil ta betalt automatisk."
            features={PRO_FEATURES}
            active={isPro}
            emphasized
            action={
              !isPro && (
                <Button
                  type="button"
                  className="w-full"
                  onClick={onUpgrade}
                  loading={checkoutLoading}
                  loadingText="Åpner"
                >
                  Oppgrader til Pro
                </Button>
              )
            }
          />
        </div>
      </SettingsSection>
    </div>
  )
}

function PlanOption({
  name,
  price,
  priceSub,
  description,
  features,
  active,
  emphasized,
  action,
}: {
  name: string
  price: string
  priceSub?: string
  description: string
  features: readonly string[]
  active: boolean
  emphasized?: boolean
  action?: ReactNode
}) {
  return (
    <Card className={emphasized ? 'border-surface-tinted-border bg-surface-tinted' : undefined}>
      <CardContent className="flex h-full flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">{name}</h3>
            {active && (
              <Badge variant="outline" size="sm">
                Nåværende plan
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium tabular-nums tracking-tight text-foreground">
              {price}
            </span>
            {priceSub && <span className="text-sm text-foreground-muted">{priceSub}</span>}
          </div>
          <p className="mt-2 text-sm text-foreground-muted">{description}</p>
        </div>

        <ul className="space-y-2.5 text-sm text-foreground-muted">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {action && <div className="mt-auto pt-1">{action}</div>}
      </CardContent>
    </Card>
  )
}

export default BillingPage
