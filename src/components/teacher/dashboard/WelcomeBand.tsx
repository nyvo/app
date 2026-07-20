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
 * Copy stays on the darker left side of the gradient; the action moves to the
 * lighter edge at wider widths so the band reads as a compact dashboard
 * module rather than a second page hero.
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
    <section
      aria-label="Velkommen"
      className="bg-gradient-brand flex flex-col gap-4 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="min-w-0">
        <h2 className="text-lg font-medium text-primary-foreground">Velkommen til UpNext</h2>
        <p className="mt-1 max-w-[44ch] text-sm text-primary-foreground">
          Sett opp studioet ditt, opprett første kurs og ta imot påmeldinger.
        </p>
      </div>
      {/* White CTA mirrors the landing hero's .btn-white; the band is
          theme-stable (see .bg-gradient-brand), so the button stays white
          with dark ink in dark mode too. */}
      <Button
        asChild
        className="w-full bg-white text-foreground shadow-[0_6px_18px_oklch(0.35_0.05_250_/_0.18)] sm:w-auto dark:text-background"
      >
        <Link to={routes.getStarted}>Kom i gang</Link>
      </Button>
    </section>
  )
}
