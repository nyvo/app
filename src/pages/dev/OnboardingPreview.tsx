import type { ReactNode } from 'react'
import { DevPage, PreviewSection } from './_kit'
import { PageState } from '@/components/page-state/page-state'
import { RoleChooser, BuyerSetupForm, SellerFlow } from '@/pages/onboarding/OnboardingPage'

/**
 * /dev/onboarding-preview — the real /onboarding sub-steps, not a hand-rolled
 * copy. `RoleChooser`, `BuyerSetupForm` and `SellerFlow` below are the exact
 * components from src/pages/onboarding/OnboardingPage.tsx — the only change
 * made there was adding `export` to each (no markup/logic touched). The 4th
 * section is the real terminal state the page falls back to when an
 * authenticated user has no profile.
 *
 * All three sub-steps call useAuth() *inside themselves* for their submit
 * mutations (setRole / completeBuyerOnboarding / ensureSeller +
 * markOnboardingComplete) rather than taking them as props — so a plain
 * no-op onAdvance/onBack alone would not stop a real submit click
 * from reaching the live Supabase RPCs. This repo's dev environment points at
 * one shared remote Supabase (see CLAUDE.md), and `ensureSeller` in
 * particular has no client-side "not logged in" guard before it fires.
 * `Inert` swallows the `submit` event in the capture phase, before it
 * reaches each form's own onSubmit, so every field/radio stays fully
 * interactive but the submit action itself is a no-op here — the full
 * end-to-end step only completes in-app at /onboarding.
 */
function Inert({ children }: { children: ReactNode }) {
  return (
    <div
      onSubmitCapture={(e) => {
        // Forms marked data-preview-safe submit pure local state (e.g.
        // SellerFlow's kontotype → navn step navigation) — let those through
        // so the preview stays navigable; block everything else.
        if ((e.target as HTMLElement).hasAttribute('data-preview-safe')) return
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-background">
      {children}
    </div>
  )
}

const noop = () => {}

export default function OnboardingPreview() {
  return (
    <DevPage
      title="Onboarding"
      description="Forhåndsvisning av hele onboardingflyten: valg av brukstype, deltakerprofil, kontotype og feiltilstand."
    >
      <PreviewSection
        label="Velg brukstype"
        description="Første steg for brukere som kommer til UpNext uten en forhåndsvalgt rolle."
      >
        <Frame>
          <Inert>
            <RoleChooser onAdvance={noop} />
          </Inert>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Deltakerprofil"
        description="Navn og valgfritt telefonnummer kan forhåndsutfylles fra en tidligere påmelding."
      >
        <Frame>
          <Inert>
            <BuyerSetupForm
              nextPath="/overview"
              onBack={noop}
              claimedName="Kari Nordmann"
              claimedPhone="98765432"
            />
          </Inert>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Kontotype"
        description="Velg ut fra hvem som holder kursene og hvilken konto som mottar betalingene. Fortsett viser sidenavnet og den offentlige lenken."
      >
        <Frame>
          <Inert>
            <SellerFlow nextPath="/overview" onBack={noop} />
          </Inert>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Profilen kunne ikke lastes"
        description="Vises når brukeren er logget inn, men profilen ikke kunne hentes."
      >
        <Frame>
          <PageState variant="server-error" as="div" />
        </Frame>
      </PreviewSection>
    </DevPage>
  )
}
