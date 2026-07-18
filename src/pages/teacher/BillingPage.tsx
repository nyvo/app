import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageShell } from '@/components/teacher/PageShell'
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs'
import { ErrorState } from '@/components/ui/error-state'
import { useAuth } from '@/contexts/AuthContext'
import { formatKroner } from '@/lib/utils'
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
  'Automatiske utbetalinger',
  '5 % plattformgebyr per betaling',
] as const

const PRO_FEATURES = [
  'Alt i Start',
  '0 % plattformgebyr',
  'Månedlig eller årlig betaling',
] as const

// Yearly Pro — 4 990 kr vs 12 × 499 kr = 5 988 kr: the 998 kr difference is
// exactly two monthly payments, so the card nudge says "2 måneder gratis".
const PRO_YEARLY = {
  price: formatKroner(4990),
  priceSub: '/år',
} as const

const BillingPage = () => {
  const { currentSeller, refreshSellers, currentSellerHydrateFailed } = useAuth()
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
  const pollTimer = useRef<number | null>(null)
  const pollDeadline = useRef(0)
  // success seen but the plan is still free — the webhook hasn't landed yet.
  const [awaitingActivation, setAwaitingActivation] = useState(false)

  const clearPoll = useCallback(() => {
    if (pollTimer.current !== null) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }, [])

  // The webhook that flips free→pro can land seconds after the redirect. Poll
  // the seller on a widening backoff, capped at ~60s so it can't run forever;
  // the isPro effect below cancels it the moment Pro lands.
  const startActivationPoll = useCallback(() => {
    clearPoll()
    pollDeadline.current = Date.now() + 60000
    let delay = 2000
    const tick = () => {
      void refreshSellers()
      if (Date.now() >= pollDeadline.current) {
        pollTimer.current = null
        setAwaitingActivation(false)
        return
      }
      delay = Math.min(Math.round(delay * 1.5), 10000)
      pollTimer.current = window.setTimeout(tick, delay)
    }
    pollTimer.current = window.setTimeout(tick, delay)
  }, [clearPoll, refreshSellers])

  // Stop the poll on unmount.
  useEffect(() => clearPoll, [clearPoll])

  // Pro landed — drop the interim line and stop polling.
  useEffect(() => {
    if (isPro) {
      setAwaitingActivation(false)
      clearPoll()
    }
  }, [isPro, clearPoll])

  useEffect(() => {
    const stripeResult = searchParams.get('stripe')
    if (!stripeResult || stripeResultHandled.current) return
    stripeResultHandled.current = true

    if (stripeResult === 'success') {
      toast.success('Abonnementet er aktivert')
      void refreshSellers()
      if (!isPro) {
        setAwaitingActivation(true)
        startActivationPoll()
      }
    } else if (stripeResult === 'cancelled') {
      toast('Abonnementet ble ikke fullført')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('stripe')
    setSearchParams(next, { replace: true })
  }, [isPro, refreshSellers, searchParams, setSearchParams, startActivationPoll])

  const handleUpgrade = useCallback(async (interval: 'month' | 'year') => {
    if (!currentSeller?.id) return
    setCheckoutLoading(true)
    const { url, error } = await createStripeCheckoutSession(currentSeller.id, interval)
    setCheckoutLoading(false)
    if (error || !url) {
      // The service already resolved a display-ready message (server body or a
      // friendlyError fallback) — surface it so reasons like "Studioet har
      // allerede Pro." aren't flattened to a generic line.
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
    <PageShell
        narrow="centered"
        title="Abonnement"
        description={
          currentSellerHydrateFailed
            ? undefined
            : isPro && !isPastDue
              ? statusLine
              : awaitingActivation
                ? 'Betalingen er mottatt. Abonnementet aktiveres om et øyeblikk.'
                : undefined
        }
        action={
          // past_due drops this header action — the "Oppdater" CTA in the alert
          // is the single primary action (both open the same Stripe portal).
          !currentSellerHydrateFailed && isPro && !isPastDue ? (
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
        {currentSellerHydrateFailed ? (
          // The plan fields are stale safe-defaults (free) — showing the upgrade
          // cards could tell a Pro subscriber they're on the free tier. Bail to a
          // bounded retry instead of a confidently-wrong view.
          <ErrorState
            title="Kunne ikke hente kontoinformasjon"
            message=""
            onRetry={refreshSellers}
          />
        ) : (
          <BillingPlanSections
            plan={currentSeller?.subscription_plan}
            status={currentSeller?.subscription_status}
            yearly={PRO_YEARLY}
            onUpgrade={handleUpgrade}
            onManage={handleManage}
            checkoutLoading={checkoutLoading}
            portalLoading={portalLoading}
          />
        )}
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
  yearly?: { price: string; priceSub: string }
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

  // Every card carries a button: the active plan states itself (disabled
  // "Nåværende plan"), the other plan is the up-/downgrade action. Downgrade
  // goes through the Stripe portal (cancel at period end) — same as Administrer.
  const startOption = (
    <PlanOption
      name="Start"
      price="Gratis"
      description="Alt du trenger for å ta imot påmeldinger og betaling."
      features={START_FEATURES}
      active={!isPro}
      action={
        isPro ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onManage}
            loading={portalLoading}
            loadingText="Åpner"
          >
            Bytt til Start
          </Button>
        ) : (
          <CurrentPlanButton />
        )
      }
    />
  )
  const proOption = (
    <PlanOption
      name="Pro"
      price={proPrice}
      priceSub={proPriceSub}
      description="Behold hele kursprisen – uansett hvor mye du selger."
      features={PRO_FEATURES}
      active={isPro}
      action={
        isPro ? (
          <CurrentPlanButton />
        ) : (
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
      {startOption}
      {proOption}
    </div>
  )

  return (
    <div className="space-y-8">
      {isPastDue && onManage && (
        <Alert variant="info">
          <AlertTitle>Betalingen gikk ikke gjennom</AlertTitle>
          <AlertDescription>
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
            <h2 className="text-lg font-semibold text-foreground">Velg plan</h2>
            {showInterval && (
              // The yearly nudge sits right beside the toggle's Årlig segment
              // and is always visible (Maze/Cycle pricing-toggle pattern:
              // "Annual billing [25% OFF]") — the incentive to flip the
              // toggle must be readable BEFORE the toggle is flipped.
              <div className="flex items-center gap-2.5">
                <SegmentedTabs<'month' | 'year'>
                  value={interval}
                  onChange={setInterval}
                  tabs={[
                    { key: 'month', label: 'Månedlig' },
                    { key: 'year', label: 'Årlig' },
                  ]}
                  ariaLabel="Betalingsintervall"
                  size="md"
                  role="radiogroup"
                />
                <Badge variant="success" size="sm">
                  2 måneder gratis
                </Badge>
              </div>
            )}
          </div>
          <div className="mt-4">{cards}</div>
        </section>
      )}
    </div>
  )
}

/** The active plan's self-describing, non-interactive slot. Rendered identically
 *  on whichever card is the current plan — a disabled, muted `secondary` — so
 *  "Nåværende plan" reads the same on both cards (the state is consistent, per
 *  Qatalog/Linktree/Kajabi pricing pages) and the filled emphasis is reserved
 *  for the real action (Oppgrader til Pro / Bytt til Start). */
function CurrentPlanButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full disabled:text-foreground-muted"
      disabled
    >
      Nåværende plan
    </Button>
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
    // rounded-2xl + a step more padding than the stock Card: the plan cards
    // are the page's focal surfaces, so they get the product-frame radius.
    // Outlined (white surface + border) rather than the stock panel fill, so
    // the filled secondary/primary buttons inside separate cleanly from the
    // card instead of blending into a grey fill.
    <Card className="h-full rounded-2xl border border-border bg-surface py-7">
      <CardContent className="flex h-full flex-col gap-5 px-7">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">{name}</h3>
            {active && (
              <Badge variant="inverted" size="sm">
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

        <ul className="space-y-2.5 text-sm font-medium text-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden />
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
