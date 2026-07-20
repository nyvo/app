import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PageShell } from '@/components/teacher/PageShell'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthContext'
import { formatKroner } from '@/lib/utils'
import { createStripeCheckoutSession, createStripePortalSession } from '@/services/billing'
import { toast } from 'sonner'
import '@/styles/plan-cards.css'

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

// Yearly Pro — 4 990 kr vs 12 × 499 kr = 5 988 kr: the 998 kr difference is
// exactly two monthly payments, so the toggle badge says "2 måneder gratis".
const PRO_YEARLY = { price: formatKroner(4990) } as const

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
  // Which redirect the running poll serves: the checkout poll waits for Pro to
  // land (cancelled by the isPro effect); the portal poll has no target state
  // and always runs its bounded window.
  const pollKind = useRef<'checkout' | 'portal' | null>(null)
  // success seen but the plan is still free — the webhook hasn't landed yet.
  const [awaitingActivation, setAwaitingActivation] = useState(false)
  // the activation poll expired without Pro landing — payment is in, webhook
  // is slow. Rendered as an info alert instead of silently reverting.
  const [activationDelayed, setActivationDelayed] = useState(false)

  const clearPoll = useCallback(() => {
    if (pollTimer.current !== null) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    pollKind.current = null
  }, [])

  // Webhook-written state (free→pro, cancel, payment fix) can land seconds
  // after a Stripe redirect. Poll the seller on a widening backoff until the
  // bounded deadline so it can't run forever.
  const startPoll = useCallback(
    (kind: 'checkout' | 'portal', durationMs: number, onExpire?: () => void) => {
      clearPoll()
      pollKind.current = kind
      pollDeadline.current = Date.now() + durationMs
      let delay = 2000
      const tick = () => {
        void refreshSellers()
        if (Date.now() >= pollDeadline.current) {
          pollTimer.current = null
          pollKind.current = null
          onExpire?.()
          return
        }
        delay = Math.min(Math.round(delay * 1.5), 10000)
        pollTimer.current = window.setTimeout(tick, delay)
      }
      pollTimer.current = window.setTimeout(tick, delay)
    },
    [clearPoll, refreshSellers],
  )

  // Stop the poll on unmount.
  useEffect(() => clearPoll, [clearPoll])

  // Pro landed — drop the interim/delayed notices and stop the checkout poll.
  // A portal poll is left alone: Pro being active is not what it waits for
  // (cancel_at_period_end etc. can land later in its window).
  useEffect(() => {
    if (isPro) {
      setAwaitingActivation(false)
      setActivationDelayed(false)
      if (pollKind.current !== 'portal') clearPoll()
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
        startPoll('checkout', 60000, () => {
          setAwaitingActivation(false)
          setActivationDelayed(true)
        })
      }
    } else if (stripeResult === 'cancelled') {
      toast('Abonnementet ble ikke fullført')
    } else if (stripeResult === 'portal') {
      // Back from the Stripe portal. Whatever changed there (cancel,
      // reactivation, new payment method) arrives via webhook — poll briefly
      // so the page converges instead of sitting on pre-portal state. No
      // toast and no expiry notice: there is no known target state.
      startPoll('portal', 20000)
    }

    const next = new URLSearchParams(searchParams)
    next.delete('stripe')
    setSearchParams(next, { replace: true })
  }, [isPro, refreshSellers, searchParams, setSearchParams, startPoll])

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
            awaitingActivation={awaitingActivation}
            activationDelayed={activationDelayed}
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
  awaitingActivation,
  activationDelayed,
}: {
  plan: SubscriptionPlan
  status?: SubscriptionStatus
  /** When set, free sellers get the Månedlig/Årlig toggle above the cards. */
  yearly?: { price: string }
  onUpgrade: (interval: 'month' | 'year') => void
  onManage?: () => void
  checkoutLoading: boolean
  portalLoading?: boolean
  /** Checkout succeeded, webhook pending — the Pro CTA disables itself. */
  awaitingActivation?: boolean
  /** Activation poll expired without Pro landing — renders the info alert. */
  activationDelayed?: boolean
}) {
  const isPro = plan === 'pro'
  const isPastDue = isPro && status === 'past_due'
  // Both post-checkout waits (interim line AND the delayed-webhook alert) keep
  // the CTA disabled — the alert must never sit above a clickable «Velg Pro».
  const activationPending = awaitingActivation || activationDelayed

  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const showInterval = !!yearly && !isPro
  const yearlySelected = showInterval && interval === 'year'

  // Same cards as the landing pricing section (src/styles/plan-cards.css):
  // white Start card + chrome featured Pro card, one shared structural
  // rhythm so dividers and check rows align. Every card carries a button —
  // the active plan states itself (disabled "Nåværende plan"), the other
  // plan is the up-/downgrade action. Downgrade goes through the Stripe
  // portal (cancel at period end) — same as Administrer.
  const cards = (
    <div className="pricing-grid">
      <article className="plan plan-white">
        <h3 className="plan-name">Start</h3>
        <p className="plan-price">Gratis</p>
        <p className="plan-desc">{`Du betaler 5${NBSP}% plattformgebyr per salg.`}</p>
        <ul className="plan-list">
          <li>
            <PlanCheck />
            Ubegrenset antall kurs og deltakere
          </li>
          <li>
            <PlanCheck />
            Kortbetaling og automatiske utbetalinger
          </li>
          <li>
            <PlanCheck />
            Egen studioside
          </li>
        </ul>
        {isPro ? (
          <PlanCta variant="chrome" onClick={onManage} loading={portalLoading}>
            Bytt til Start
          </PlanCta>
        ) : (
          <CurrentPlanButton />
        )}
      </article>

      <article className="plan plan-featured">
        <h3 className="plan-name">
          Pro {!isPro && <span className="plan-tag">Anbefalt</span>}
        </h3>
        <p className="plan-price plan-price-swap" data-yearly={yearlySelected ? '' : undefined}>
          <span className="pp-layer pp-monthly" aria-hidden={yearlySelected}>
            {formatKroner(499)}
            <small> / mnd eks. mva.</small>
          </span>
          {yearly && (
            <span className="pp-layer pp-yearly" aria-hidden={!yearlySelected}>
              {yearly.price}
              <small> / år eks. mva.</small>
            </span>
          )}
        </p>
        <p className="plan-desc">
          {yearlySelected
            ? 'Fast årspris – ingen plattformgebyr.'
            : 'Fast månedspris – ingen plattformgebyr.'}
        </p>
        <ul className="plan-list">
          <li>
            <PlanCheck />
            Alt i Start
          </li>
          <li>
            <PlanCheck />
            {`0${NBSP}% plattformgebyr`}
          </li>
          <li>
            <PlanCheck />
            Ingen bindingstid
          </li>
        </ul>
        <p className="plan-note">
          Selger du for mer enn {formatKroner(10000)} i måneden, lønner Pro seg.
        </p>
        {isPro ? (
          <CurrentPlanButton />
        ) : (
          <PlanCta
            variant="white"
            onClick={() => onUpgrade(showInterval ? interval : 'month')}
            loading={checkoutLoading}
            disabled={activationPending}
          >
            {activationPending ? 'Aktiveres' : 'Velg Pro'}
          </PlanCta>
        )}
      </article>
    </div>
  )

  return (
    <div className="plan-cards plan-cards--compact space-y-8">
      {!isPro && activationDelayed && (
        // Payment went through but the webhook still hasn't flipped the plan —
        // name the delay instead of silently reverting to the free view right
        // after the success toast.
        <Alert variant="info">
          <AlertTitle>Betalingen er mottatt</AlertTitle>
          <AlertDescription>
            Aktiveringen tar lengre tid enn vanlig. Oppdater siden om et par minutter.
          </AlertDescription>
        </Alert>
      )}

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
            <h2 className="text-lg font-medium text-foreground">Velg plan</h2>
            {showInterval && (
              // Same toggle as the landing pricing section: flanking labels,
              // grey track on the monthly default, azure when yearly is on,
              // the incentive badge OUTSIDE the control beside Årlig.
              <div className="price-toggle">
                <button
                  type="button"
                  className="pt-opt"
                  data-active={interval === 'month' ? '' : undefined}
                  onClick={() => setInterval('month')}
                >
                  Månedlig
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={interval === 'year'}
                  aria-label="Årlig betaling"
                  className="pt-switch"
                  onClick={() => setInterval((v) => (v === 'year' ? 'month' : 'year'))}
                >
                  <span className="pt-knob" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="pt-opt"
                  data-active={interval === 'year' ? '' : undefined}
                  onClick={() => setInterval('year')}
                >
                  Årlig
                </button>
                <span className="pt-save">2 måneder gratis</span>
              </div>
            )}
          </div>
          <div className="mt-4">{cards}</div>
        </section>
      )}
    </div>
  )
}

const NBSP = ' '

function PlanCheck() {
  return (
    <span className="check" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5l2.6 2.6L10 3.5" />
      </svg>
    </span>
  )
}

/** Card CTA in the shared plan-card style, with the dashboard loading state. */
function PlanCta({
  variant,
  onClick,
  loading,
  disabled,
  children,
}: {
  variant: 'chrome' | 'white'
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={variant === 'white' ? 'pc-btn pc-btn-white' : 'pc-btn pc-btn-chrome'}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          Åpner
        </>
      ) : (
        children
      )}
    </button>
  )
}

/** The active plan states itself: disabled and muted, rendered identically on
 *  whichever card is current, so the filled emphasis is reserved for the real
 *  action (Velg Pro / Bytt til Start). */
function CurrentPlanButton() {
  return (
    <button type="button" className="pc-btn pc-btn-current" disabled>
      Nåværende plan
    </button>
  )
}

export default BillingPage
