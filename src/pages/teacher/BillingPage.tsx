import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ExternalLink, Sparkles } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { PageShell } from '@/components/teacher/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { cn, formatKroner } from '@/lib/utils'
import { createStripeCheckoutSession, createStripePortalSession } from '@/services/billing'
import { toast } from 'sonner'

type SubscriptionPlan = string | null | undefined
type SubscriptionStatus = string | null | undefined

/** Subscription state → a short status line for the Pro summary row. */
export function subscriptionStatusLine(
  status: SubscriptionStatus,
  renewsAt: string | null,
  cancelAtPeriodEnd: boolean,
): string {
  if (status === 'past_due') return 'Betaling feilet – oppdater kortet for å beholde Pro'
  if (status === 'active') {
    if (cancelAtPeriodEnd) {
      return renewsAt
        ? `Abonnementet ditt utgår ${renewsAt}`
        : 'Abonnementet ditt utgår ved periodeslutt'
    }
    return renewsAt ? `Fornyes automatisk ${renewsAt}` : 'Aktiv'
  }
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

  const renewsAt = currentSeller?.subscription_current_period_end
    ? formatBillingDate(currentSeller.subscription_current_period_end)
    : null

  // StrictMode (dev) double-invokes effects; the toast + refresh must run once
  // per checkout return, so dedupe with a ref.
  const stripeResultHandled = useRef(false)
  useEffect(() => {
    const stripeResult = searchParams.get('stripe')
    if (!stripeResult || stripeResultHandled.current) return
    stripeResultHandled.current = true

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
          cancelAtPeriodEnd={currentSeller?.subscription_cancel_at_period_end ?? false}
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
  cancelAtPeriodEnd = false,
  yearly,
  onUpgrade,
  onManage,
  checkoutLoading,
  portalLoading,
}: {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  renewsAt: string | null
  cancelAtPeriodEnd?: boolean
  /** When set, free sellers get a Månedlig/Årlig toggle on the Pro card. */
  yearly?: { price: string; priceSub: string }
  onUpgrade: () => void
  onManage: () => void
  checkoutLoading: boolean
  portalLoading: boolean
}) {
  const isPro = plan === 'pro'
  const statusLine = subscriptionStatusLine(status, renewsAt, cancelAtPeriodEnd)

  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const showInterval = !!yearly && !isPro
  const proPrice = showInterval && interval === 'year' ? yearly.price : formatKroner(499)
  const proPriceSub = showInterval && interval === 'year' ? yearly.priceSub : '/mnd'

  const startOption = (
    <PlanOption
      name="Start"
      price="Gratis"
      description="For instruktører som vil ta påmeldinger og håndtere betaling selv."
      features={START_FEATURES}
      active={!isPro}
    />
  )
  const proOption = (
    <PlanOption
      name="Pro"
      price={proPrice}
      priceSub={proPriceSub}
      description="For instruktører og studioer som vil ta betalt automatisk."
      features={PRO_FEATURES}
      active={isPro}
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
  )

  return (
    <div className="space-y-6">
      {/* Free sellers: "Velg plan" anchors the row; the Månedlig/Årlig toggle
          (when yearly pricing is configured) sits on the right. */}
      {!isPro && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-foreground">Velg plan</h2>
          {showInterval && (
            <IntervalToggle interval={interval} onChange={setInterval} />
          )}
        </div>
      )}

      {/* Pro only: the live subscription's status + billing management. */}
      {isPro && (
        <div className="flex flex-col gap-3 border-b border-border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-foreground-muted">{statusLine}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={onManage}
            loading={portalLoading}
            loadingText="Åpner"
          >
            Administrer abonnement
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isPro ? (
          <>
            {startOption}
            {proOption}
          </>
        ) : (
          <>
            <PlanColumn>{startOption}</PlanColumn>
            <PlanColumn featured label="Anbefalt">
              {proOption}
            </PlanColumn>
          </>
        )}
      </div>

      <p className="text-sm text-foreground-muted">Alle priser er eks. mva.</p>
    </div>
  )
}

/** Segmented Månedlig/Årlig switch — active segment is a white pill. */
function IntervalToggle({
  interval,
  onChange,
}: {
  interval: 'month' | 'year'
  onChange: (next: 'month' | 'year') => void
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-muted p-0.5 text-sm">
      {(['month', 'year'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={interval === value}
          className={cn(
            'rounded-full px-3 py-1 font-medium transition-colors',
            interval === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground',
          )}
        >
          {value === 'month' ? 'Månedlig' : 'Årlig'}
        </button>
      ))}
    </div>
  )
}

/**
 * Wraps the featured plan: the SAME card as every tier, sitting inside an outer
 * frame whose header caps it with "Mest populær". Non-featured columns reserve
 * the header height (desktop) so the inner cards line up.
 */
function PlanColumn({
  featured,
  label,
  children,
}: {
  featured?: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col">
      {featured ? (
        <div className="flex h-10 items-center justify-center gap-1.5 rounded-t-2xl bg-muted text-sm font-medium text-foreground">
          <Sparkles className="size-3.5 fill-current" aria-hidden />
          {label}
        </div>
      ) : (
        <div className="hidden h-10 md:block" aria-hidden />
      )}
      <div className={cn('flex-1', featured && 'rounded-b-2xl bg-muted p-1.5 pt-0')}>
        {children}
      </div>
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
  action,
}: {
  name: string
  price: string
  priceSub?: string
  description: string
  features: readonly string[]
  active: boolean
  action?: ReactNode
}) {
  return (
    <Card className="h-full border-border">
      <CardContent className="flex h-full flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">{name}</h3>
            {active && (
              <Badge variant="neutral" size="sm" className="text-foreground">
                Aktiv plan
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="whitespace-nowrap text-2xl font-medium tabular-nums tracking-tight text-foreground">
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
