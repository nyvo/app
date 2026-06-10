import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, CreditCard, ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { PageShell } from '@/components/teacher/PageShell'
import { SettingsSection } from '@/components/teacher/SettingsSection'
import { useAuth } from '@/contexts/AuthContext'
import { createStripeCheckoutSession, createStripePortalSession } from '@/services/billing'
import { toast } from 'sonner'

function planLabel(plan: string | null | undefined): string {
  return plan === 'pro' ? 'Pro' : 'Start'
}

function statusLabel(status: string | null | undefined): string {
  if (status === 'active') return 'Aktiv'
  if (status === 'past_due') return 'Betaling krever oppfølging'
  if (status === 'canceled') return 'Avsluttet'
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
  'Betaling avtales direkte med instruktør',
  'Ingen Dintero-oppsett',
] as const

const PRO_FEATURES = [
  'Kortbetaling og Vipps i checkout',
  'Automatiske utbetalinger via Dintero',
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
        <div className="space-y-10">
          <SettingsSection title="Plan">
            <Card>
              <CardContent className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {planLabel(currentSeller?.subscription_plan)}
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {statusLabel(currentSeller?.subscription_status)}
                      {renewsAt ? ` · Fornyes ${renewsAt}` : ''}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground-muted">
                    <CreditCard className="size-5" aria-hidden />
                  </div>
                </div>

                {isPro ? (
                  <Button
                    type="button"
                    onClick={handleManage}
                    loading={portalLoading}
                    loadingText="Åpner"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Administrer abonnement
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleUpgrade}
                    loading={checkoutLoading}
                    loadingText="Åpner"
                  >
                    Oppgrader til Pro
                  </Button>
                )}
              </CardContent>
            </Card>
          </SettingsSection>

          <SettingsSection title="Velg plan">
            <div className="grid gap-4 md:grid-cols-2">
              <PlanOption
                name="Start"
                price="0 kr/mnd"
                description="For instruktører som vil ta påmeldinger og håndtere betaling selv."
                features={START_FEATURES}
                active={!isPro}
              />
              <PlanOption
                name="Pro"
                price="Fra 499 kr/mnd eks. mva"
                description="For instruktører og studioer som vil ta betalt automatisk."
                features={PRO_FEATURES}
                active={isPro}
                action={
                  isPro ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleManage}
                      loading={portalLoading}
                      loadingText="Åpner"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                      Administrer
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleUpgrade}
                      loading={checkoutLoading}
                      loadingText="Åpner"
                    >
                      Oppgrader
                    </Button>
                  )
                }
              />
            </div>
          </SettingsSection>

          {isPro && !hasStripeCustomer && (
            <p className="text-sm text-foreground-muted">
              Abonnementet er aktivt, men mangler Stripe-kunde. Kontakt support for fakturering.
            </p>
          )}
        </div>
      </PageShell>
    </main>
  )
}

function PlanOption({
  name,
  price,
  description,
  features,
  active,
  action,
}: {
  name: string
  price: string
  description: string
  features: readonly string[]
  active: boolean
  action?: ReactNode
}) {
  return (
    <Card className={active ? 'border-foreground/25' : undefined}>
      <CardContent className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-foreground">{name}</h2>
              {active && (
                <Badge variant="neutral" size="sm">
                  Nåværende
                </Badge>
              )}
            </div>
            <p className="mt-2 text-2xl font-medium tracking-tight text-foreground">{price}</p>
            <p className="mt-2 text-sm text-foreground-muted">{description}</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
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
