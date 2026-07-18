import { useMemo } from 'react'
import { CreditCard, BookOpen, Image, User } from '@/lib/icons'
import type { IconComponent } from '@/lib/icons'
import type { Seller } from '@/types/database'
import { routes } from '@/lib/routes'

export interface SetupStep {
  id: 'account' | 'payments' | 'course' | 'logo'
  title: string
  description: string
  isComplete: boolean
  actionLabel: string
  actionHref?: string
  actionOnClick?: () => void
  icon: IconComponent
  timeEstimate?: string
  /** Polish step — shown on the checklist but not counted in the progress bar. */
  optional?: boolean
}

interface UseSetupProgressParams {
  currentSeller: Seller | null
  hasPublishedCourse: boolean
  /** Any course (any status) with a price > 0 — makes Stripe onboarding required. */
  hasPaidCourse: boolean
  /** Most recent draft course, if any — lets the course step resume it. */
  draftCourseId: string | null
  onConnectPayments: () => void
}

interface UseSetupProgressResult {
  /** Required steps — these drive the progress bar and completion. */
  steps: SetupStep[]
  /** Optional polish steps (logo) — shown but never block completion. */
  optionalSteps: SetupStep[]
  completedCount: number
  totalCount: number
  isSetupComplete: boolean
  nextStep: SetupStep | null
  motivationalSubtitle: string
}

function getMotivationalSubtitle(completedCount: number, totalCount: number): string {
  const remaining = totalCount - completedCount
  if (remaining === 0) return 'Du er klar til å ta imot påmeldinger og betaling'
  if (remaining === 1) return 'Nesten i mål – ett steg igjen'
  return `${remaining} steg igjen før du kan ta imot påmeldinger`
}

export function useSetupProgress({
  currentSeller,
  hasPublishedCourse,
  hasPaidCourse,
  draftCourseId,
  onConnectPayments,
}: UseSetupProgressParams): UseSetupProgressResult {
  return useMemo(() => {
    const seller = currentSeller

    // Stripe onboarding is only a publish blocker for PAID courses (see
    // publishNeedsPaymentSetup + the DB trigger) — a free-course seller must
    // be able to finish setup without KYC. So the step is required once a
    // paid course exists (or once payouts are already connected, so the
    // completed step stays visible), and sits under "Valgfritt" until then.
    const paymentsRequired = hasPaidCourse || !!seller?.stripe_onboarding_complete
    const paymentsStep: SetupStep = {
      id: 'payments',
      title: 'Aktiver betalinger',
      description: paymentsRequired
        ? 'Koble til Stripe så du kan ta betalt for kursene dine.'
        : 'Trengs først når du tar betalt for et kurs.',
      isComplete: !!seller?.stripe_onboarding_complete,
      actionLabel: 'Aktiver',
      actionOnClick: onConnectPayments,
      icon: CreditCard,
      optional: !paymentsRequired,
    }

    // Required steps. The pre-completed account step seeds the progress bar
    // (endowed progress — it never starts at zero), and the first course comes
    // before payouts: the builder is the quick, motivating task, KYC the slow
    // one, and only a paid course actually needs Stripe to publish.
    const steps: SetupStep[] = [
      {
        id: 'account',
        title: 'Opprett konto',
        description: '',
        isComplete: true,
        actionLabel: '',
        icon: User,
      },
      {
        id: 'course',
        title: 'Publiser ditt første kurs',
        description: 'Legg ut et kurs, så kan elevene melde seg på.',
        isComplete: hasPublishedCourse,
        // Resume an existing draft instead of starting a fresh course.
        actionLabel: draftCourseId ? 'Fortsett' : 'Opprett kurs',
        actionHref: draftCourseId ? routes.course(draftCourseId) : routes.coursesNew,
        icon: BookOpen,
        timeEstimate: 'ca. 3 min',
      },
      ...(paymentsRequired ? [paymentsStep] : []),
    ]

    // Optional polish — improves the storefront but isn't required to take
    // bookings, so it sits apart from the X/N progress count.
    const optionalSteps: SetupStep[] = [
      ...(paymentsRequired ? [] : [paymentsStep]),
      {
        id: 'logo',
        title: 'Last opp logo',
        description: 'Logoen vises øverst på studiosiden din.',
        isComplete: !!seller?.logo_url,
        actionLabel: 'Last opp',
        actionHref: routes.studio,
        icon: Image,
        optional: true,
      },
    ]

    const completedCount = steps.filter((s) => s.isComplete).length
    const totalCount = steps.length
    const nextStep = steps.find((s) => !s.isComplete) || null
    const motivationalSubtitle = getMotivationalSubtitle(completedCount, totalCount)

    return {
      steps,
      optionalSteps,
      completedCount,
      totalCount,
      isSetupComplete: completedCount === totalCount,
      nextStep,
      motivationalSubtitle,
    }
  }, [currentSeller, hasPublishedCourse, hasPaidCourse, draftCourseId, onConnectPayments])
}
