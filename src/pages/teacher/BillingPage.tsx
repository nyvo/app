import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ExternalLink, Sparkles } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageShell } from '@/components/teacher/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { cn, formatKroner } from '@/lib/utils'
import { createStripeCheckoutSession, createStripePortalSession } from '@/services/billing'
import { friendlyError } from '@/lib/error-messages'
import { toast } from 'sonner'

type SubscriptionPlan = string | null | undefined
type SubscriptionStatus = string | null | undefined

/** Subscription state → a short status line for the Pro summary row. */
export function subscriptionStatusLine(
  status: SubscriptionStatus,
  renewsAt: string | null,
  cancelAtPeriodEnd: boolean,
): string {
  // past_due is surfaced as a dedicated warning alert (see BillingPlanSections),
  // not as this muted status line.
  if (status === 'active') {
    if (cancelAtPeriodEnd) {
      return renewsAt
        ? `Abonnementet ditt utgår ${renewsAt}`
        : 'Abonnementet ditt utgår ved periodeslutt'
    }
    return renewsAt ? `Fornyes automatisk ${renewsAt}` : 'Fornyes automatisk'
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
  'Kortbetaling ved påmelding',
  'Automatiske utbetalinger via Stripe',
  '5 % plattformgebyr per betaling',
] as const

const PRO_FEATURES = [
  'Alt i Start',
  '0 % plattformgebyr – du beholder hele kursprisen',
  'Månedlig eller årlig betaling',
] as const

// Yearly Pro — ~2 months free vs 12 × 499 kr.
const PRO_YEARLY = {
  price: formatKroner(4990),
  priceSub: '/år',
  savings: `Spar ${formatKroner(998)}`,
} as const

const BillingPage = () => {
  const { currentSeller, refreshSellers } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const isPro = currentSeller?.subscription_plan === 'pro'
  const isPastDue = isPro && currentSeller?.subscription_status === 'past_due'
  const renewsAt = currentSeller?.subscription_current_period_end
    ? formatBillingDate(currentSeller.subscription_current_period_end)
    : null
  const statusLine = subscriptionStatusLine(
    currentSeller?.subscription_status,
    renewsAt,
    currentSeller?.subscription_cancel_at_period_end ?? false,
  )

  // StrictMode (dev) double-invokes effects; the toast + refresh must run once
  // per checkout return, so dedupe with a ref.
  const stripeResultHandled = useRef(false)
  const refreshTimers = useRef<number[]>([])
  useEffect(() => () => refreshTimers.current.forEach(clearTimeout), [])
  useEffect(() => {
    const stripeResult = searchParams.get('stripe')
    if (!stripeResult || stripeResultHandled.current) return
    stripeResultHandled.current = true

    if (stripeResult === 'success') {
      toast.success('Abonnementet er aktivert')
      // The webhook that flips the seller to Pro can land after the redirect —
      // refresh a couple more times so the page doesn't keep showing the
      // upgrade cards on a completed checkout.
      void refreshSellers()
      refreshTimers.current = [2500, 6000].map((ms) =>
        window.setTimeout(() => void refreshSellers(), ms),
      )
    } else if (stripeResult === 'cancelled') {
      toast('Abonnementet ble ikke fullført')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('stripe')
    setSearchParams(next, { replace: true })
  }, [refreshSellers, searchParams, setSearchParams])

  const handleUpgrade = useCallback(async (interval: 'month' | 'year') => {
    if (!currentSeller?.id) return
    setCheckoutLoading(true)
    const { url, error } = await createStripeCheckoutSession(currentSeller.id, interval)
    setCheckoutLoading(false)
    if (error || !url) {
      toast.error(friendlyError(error, 'Kunne ikke starte abonnement.'))
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
      toast.error(friendlyError(error, 'Kunne ikke åpne fakturering.'))
      return
    }
    window.location.assign(url)
  }, [currentSeller?.id])

  return (
    <PageShell
        narrow="centered"
        title="Abonnement"
        description={isPro && !isPastDue ? statusLine : undefined}
        action={
          // past_due drops this header action — the "Oppdater" CTA in the alert
          // is the single primary action (both open the same Stripe portal).
          isPro && !isPastDue ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleManage}
              loading={portalLoading}
              loadingText="Åpner"
            >
              Administrer abonnement
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          ) : undefined
        }
      >
        <BillingPlanSections
          plan={currentSeller?.subscription_plan}
          status={currentSeller?.subscription_status}
          yearly={PRO_YEARLY}
          onUpgrade={handleUpgrade}
          onManage={handleManage}
          checkoutLoading={checkoutLoading}
          portalLoading={portalLoading}
        />
      </PageShell>
  )
}

/**
 * Presentational plan UI — current-plan summary + Start/Pro comparison.
 * Exported so /dev/billing-preview can render the states without auth.
 */
export function BillingPlanSections({
  plan,
  status,
  yearly,
  onUpgrade,
  onManage,
  checkoutLoading,
  portalLoading,
}: {
  plan: SubscriptionPlan
  status?: SubscriptionStatus
  /** When set, free sellers get a Månedlig/Årlig toggle on the Pro card. */
  yearly?: { price: string; priceSub: string; savings?: string }
  onUpgrade: (interval: 'month' | 'year') => void
  onManage?: () => void
  checkoutLoading: boolean
  portalLoading?: boolean
}) {
  const isPro = plan === 'pro'
  const isPastDue = isPro && status === 'past_due'

  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const showInterval = !!yearly && !isPro
  const proPrice = showInterval && interval === 'year' ? yearly.price : formatKroner(499)
  const proPriceSub = showInterval && interval === 'year' ? yearly.priceSub : '/mnd'

  const startOption = (
    <PlanOption
      name="Start"
      price="Gratis"
      description="Alt du trenger for å ta imot påmeldinger og betaling."
      features={START_FEATURES}
      active={!isPro}
    />
  )
  const proOption = (
    <PlanOption
      name="Pro"
      price={proPrice}
      priceSub={proPriceSub}
      description="Lønner seg fra rundt 10 000 kr i påmeldinger i måneden."
      features={PRO_FEATURES}
      active={isPro}
      action={
        !isPro && (
          <Button
            type="button"
            className="w-full"
            onClick={() => onUpgrade(showInterval ? interval : 'month')}
            loading={checkoutLoading}
            loadingText="Åpner"
          >
            Oppgrader til Pro
          </Button>
        )
      }
    />
  )

  const cards = (
    <div className="grid gap-6 md:grid-cols-2">
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
  )

  return (
    <div className="space-y-8">
      {isPastDue && onManage && (
        <Alert variant="warning">
          <AlertTitle className="text-base">Betalingen gikk ikke gjennom</AlertTitle>
          <AlertDescription className="text-base text-foreground">
            Oppdater betalingsmåten for å beholde Pro-abonnementet.
          </AlertDescription>
          <div className="mt-3">
            <Button
              type="button"
              onClick={onManage}
              loading={portalLoading}
              loadingText="Åpner"
            >
              Oppdater
            </Button>
          </div>
        </Alert>
      )}

      {isPro ? (
        cards
      ) : (
        // "Velg plan" + the cards form one group: the header binds to the cards
        // below it (16px) and is separated from the page header above by the
        // outer rhythm, so it reads as the section anchor instead of floating.
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-foreground">Velg plan</h2>
            {showInterval && (
              <IntervalToggle
                interval={interval}
                onChange={setInterval}
                savings={yearly?.savings}
              />
            )}
          </div>
          <div className="mt-4">{cards}</div>
        </section>
      )}
    </div>
  )
}

/** Segmented Månedlig/Årlig switch — mirrors SegmentedTabs construction
 *  (muted track, bg-surface + shadow-xs active pill, ring-subtle focus) but
 *  stays bespoke because the yearly segment carries the savings nudge, which
 *  SegmentedTabs' string labels can't render. */
function IntervalToggle({
  interval,
  onChange,
  savings,
}: {
  interval: 'month' | 'year'
  onChange: (next: 'month' | 'year') => void
  savings?: string
}) {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-full bg-muted p-1 text-sm">
      {(['month', 'year'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={interval === value}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-medium transition-colors',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring-subtle',
            interval === value
              ? 'bg-surface text-foreground shadow-xs'
              : 'text-foreground-muted hover:text-foreground',
          )}
        >
          {value === 'month' ? 'Månedlig' : 'Årlig'}
          {value === 'year' && savings && <span className="text-success">{savings}</span>}
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
          <Sparkles className="size-3.5" aria-hidden />
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
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-medium text-foreground">{name}</h3>
            {active && (
              <Badge variant="neutral" size="sm">
                Aktiv plan
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="whitespace-nowrap text-2xl font-medium tabular-nums text-foreground">
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

        {action && <div className="mt-auto">{action}</div>}
      </CardContent>
    </Card>
  )
}

export default BillingPage
