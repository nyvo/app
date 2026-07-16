import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { routes } from '@/lib/routes'
import type { Seller } from '@/types/database'

/**
 * Dashboard-wide banner for a connected account that Stripe restricted *after*
 * onboarding — charges or payouts paused pending new verification.
 *
 * Stripe's verification is ongoing, not one-time: a live studio can be flipped
 * to `restricted` (charges off) or lose `payouts_enabled` at any point when a
 * requirement comes due. Without this, the only surface for that is
 * /settings/payouts — a page the seller has no reason to revisit — so a live
 * studio could silently stop taking bookings. The banner rides on every
 * dashboard page and routes to the payouts page for the precise fix.
 *
 * It intentionally does NOT cover the initial "set up payouts" nudge (that's
 * SidebarSetupCard + the per-course ReadinessCard) — only accounts that got far
 * enough for Stripe to submit + then restrict. `restricted`/`rejected` require
 * details_submitted; `payouts_paused` requires onboarding complete — so a
 * mid-onboarding `pending` seller never triggers it.
 */

type AccountActionReason = 'rejected' | 'restricted' | 'payouts_paused'

function accountActionReason(seller: Seller): AccountActionReason | null {
  // No account yet → this is the "get started" case, not a restriction.
  if (!seller.stripe_account_id) return null
  if (seller.stripe_account_status === 'rejected') return 'rejected'
  // restricted / payouts-off only warrant the banner when Stripe actually has
  // requirements outstanding. Without them the account is merely under review
  // (e.g. the brief window right after onboarding) — nothing for the seller to
  // do, so stay silent rather than raise a false "handling kreves" alarm.
  if (!seller.stripe_requirements_due) return null
  if (seller.stripe_account_status === 'restricted') return 'restricted'
  if (seller.stripe_onboarding_complete && !seller.stripe_payouts_enabled) return 'payouts_paused'
  return null
}

type Tone = 'warning' | 'danger'

const copy: Record<
  AccountActionReason,
  { tone: Tone; title: string; body: string; cta: string }
> = {
  rejected: {
    tone: 'danger',
    title: 'Kontoen ble avvist',
    body: 'Stripe kan ikke aktivere betalinger for studioet. Se detaljer for å finne en løsning.',
    cta: 'Se detaljer',
  },
  restricted: {
    tone: 'warning',
    title: 'Betalinger er ikke aktive',
    body: 'Studioet kan ikke ta imot påmeldinger før Stripe-verifiseringen er fullført.',
    cta: 'Se status',
  },
  payouts_paused: {
    tone: 'warning',
    title: 'Utbetalinger er satt på pause',
    body: 'Kortbetalinger virker, men Stripe trenger mer før pengene kan overføres til deg.',
    cta: 'Se hva som mangler',
  },
}

// The whole container carries the status colour — a `-subtle` tint fill with a
// stronger same-hue border (the sanctioned status treatment, not a saturated
// fill). No leading icon; the tint + border do the signalling, so the title
// stays foreground ink (a coloured title reads too bright on the pale fill).
const containerClass: Record<Tone, string> = {
  warning: 'bg-warning-subtle border-warning/40',
  danger: 'bg-danger-subtle border-danger/40',
}

export function AccountStatusBanner() {
  const { currentSeller, currentSellerHydrateFailed } = useAuth()
  const location = useLocation()

  // Unknown state (hydrate failed → safe public-column defaults) must not raise
  // a false alarm. Suppress on the payouts page itself — the stepper there is
  // the authoritative, more detailed surface.
  if (!currentSeller || currentSellerHydrateFailed) return null
  if (location.pathname === routes.settingsPayouts) return null

  const reason = accountActionReason(currentSeller)
  if (!reason) return null

  const c = copy[reason]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="alert"
        className={cn('rounded-lg border px-4 py-3', containerClass[c.tone])}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium leading-5 text-foreground">{c.title}</div>
            <div className="mt-1 text-sm leading-5 text-foreground-muted">{c.body}</div>
          </div>
          <Button asChild size="sm" className="shrink-0 self-start sm:self-auto">
            <Link to={routes.settingsPayouts}>{c.cta}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
