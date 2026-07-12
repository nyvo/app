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
 * no-op onAdvance/onBack alone would not stop a real Fortsett/Fullfør click
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
      description="De ekte onboarding-stegene fra src/pages/onboarding/OnboardingPage.tsx (ruten /onboarding) — rollevalg, kjøper- og selger-oppsett, pluss feiltilstanden uten profil."
    >
      <PreviewSection
        label="Velg rolle"
        description="RoleChooser — vises når profile.role er null. Fortsett er koblet fra her (se filens toppkommentar)."
      >
        <Frame>
          <Inert>
            <RoleChooser onAdvance={noop} />
          </Inert>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Kjøper-oppsett"
        description="BuyerSetupForm med mock-forhåndsutfylling (claimedName/claimedPhone). Fullfør ville normalt kalt completeBuyerOnboarding()."
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
        label="Selger-flyt"
        description="SellerFlow — navnefeltet starter tomt her fordi det leser fra live (utlogget) konto-kontekst; i appen forhåndsutfylt fra visningsnavnet. Fullfør ville normalt kalt ensureSeller() + markOnboardingComplete()."
      >
        <Frame>
          <Inert>
            <SellerFlow nextPath="/overview" onBack={noop} />
          </Inert>
        </Frame>
      </PreviewSection>

      <PreviewSection
        label="Feil (ingen profil)"
        description="PageState variant=server-error — den ekte fallbacken når en innlogget bruker mangler profil (OnboardingPage.tsx)."
      >
        <Frame>
          <PageState variant="server-error" as="div" />
        </Frame>
      </PreviewSection>
    </DevPage>
  )
}
