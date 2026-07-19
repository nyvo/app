import { DevPage, PreviewSection } from './_kit'
import { StepCard, GoLiveBanner } from '@/pages/teacher/GetStartedPage'
import type { SetupStep } from '@/hooks/use-setup-progress'
import { BookOpen, CreditCard, Image } from '@/lib/icons'

/**
 * /dev/get-started-preview — the real /get-started checklist pieces
 * (`StepCard`, `GoLiveBanner` from src/pages/teacher/GetStartedPage.tsx) fed
 * mock steps, so the page is reviewable without an authed seller. Actions are
 * no-op buttons here; in-app the rows link to the course builder / payout
 * settings / studio page.
 */
const noop = () => {}

function step(overrides: Partial<SetupStep> & Pick<SetupStep, 'id' | 'title' | 'icon'>): SetupStep {
  return {
    description: '',
    isComplete: false,
    actionLabel: '',
    actionOnClick: noop,
    ...overrides,
  }
}

const courseStep = step({
  id: 'course',
  title: 'Publiser ditt første kurs',
  description: 'Legg ut et kurs, så kan elevene melde seg på.',
  icon: BookOpen,
  timeEstimate: 'ca. 3 min',
})

const paymentsStep = step({
  id: 'payments',
  title: 'Aktiver betalinger',
  description: 'Koble til Stripe så du kan ta betalt for kursene dine.',
  icon: CreditCard,
})

const logoStep = step({
  id: 'logo',
  title: 'Last opp logo',
  description: 'Logoen vises øverst på studiosiden din.',
  icon: Image,
})

export default function GetStartedPreview() {
  return (
    <DevPage
      title="Kom i gang"
      description="Sjekklisten fra /get-started (StepCard + GoLiveBanner fra GetStartedPage.tsx) med mock-steg. Radene er no-op-knapper her."
    >
      <PreviewSection
        label="Nytt studio"
        description="Alle steg gjenstår — ingen tom-markør, bare tid + chevron."
      >
        <div className="max-w-3xl space-y-3">
          <StepCard step={courseStep} />
          <StepCard step={paymentsStep} />
          <StepCard step={logoStep} />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Underveis"
        description="Fullførte steg får den grønne haken i høyre slot; teksten dempes."
      >
        <div className="max-w-3xl space-y-3">
          <StepCard step={{ ...courseStep, isComplete: true }} />
          <StepCard step={paymentsStep} />
          <StepCard step={logoStep} />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Klart"
        description="Påkrevde steg fullført — banner + gjenstående polering."
      >
        <div className="max-w-3xl">
          <GoLiveBanner />
          <p className="mt-12 mb-3 text-base font-medium text-foreground">
            Gjør studiosiden ferdig
          </p>
          <div className="space-y-3">
            <StepCard step={logoStep} />
          </div>
        </div>
      </PreviewSection>
    </DevPage>
  )
}
