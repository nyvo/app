import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { routes } from '@/lib/routes'
import { useSellerSetupStatus } from '@/hooks/use-seller-setup-status'

/**
 * First-run welcome band — the ONE azure-gradient surface in the app
 * (ratified 2026-07-18 as a narrow exception to "azure never on containers";
 * see `.bg-gradient-brand` in src/index.css). A marketing-grade moment for
 * brand-new sellers only: it renders while required setup steps are
 * outstanding and disappears permanently once setup completes — the
 * steady-state dashboard stays baseline-expression. The persistent onboarding
 * anchor remains the sidebar "Oppsett" row; this band is a greeting with one
 * CTA, deliberately NOT a checklist (a dashboard-home setup card was
 * rejected 2026-07).
 *
 * Copy sits in the top half of the band where the gradient holds L ≤ 0.56 —
 * white text is AA there; don't move text below the light bloom.
 */
export function WelcomeBand() {
  const { isSetupComplete, isLoading, loadFailed } = useSellerSetupStatus()

  // Same tradeoff as SidebarSetupCard: hold until the fetch resolves rather
  // than flashing a band we may immediately remove; a failed fetch hides it
  // too (this is a greeting, not a surface that should ever show an error).
  if (isLoading || loadFailed || isSetupComplete) return null

  return <WelcomeBandCard />
}

/** Presentational band — exported separately so /dev previews can render it
 *  without auth or setup-status state. */
export function WelcomeBandCard() {
  return (
    <section aria-label="Velkommen" className="bg-gradient-brand rounded-3xl px-6 py-6 sm:px-7">
      <h2 className="text-xl font-semibold text-primary-foreground">Velkommen til Raden</h2>
      <p className="mt-1.5 max-w-[44ch] text-sm text-primary-foreground">
        Sett opp studioet ditt, opprett første kurs og ta imot påmeldinger.
      </p>
      <Button asChild className="mt-4">
        <Link to={routes.getStarted}>Kom i gang</Link>
      </Button>
    </section>
  )
}
