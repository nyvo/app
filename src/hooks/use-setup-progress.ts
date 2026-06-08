import { useMemo } from 'react'
import { CreditCard, BookOpen, MapPin, Image } from '@/lib/icons'
import type { LucideIcon } from '@/lib/icons'
import type { Seller } from '@/types/database'
import { routes } from '@/lib/routes'

export interface SetupStep {
  id: 'payments' | 'location' | 'course' | 'logo'
  title: string
  description: string
  isComplete: boolean
  actionLabel: string
  actionHref?: string
  actionOnClick?: () => void
  icon: LucideIcon
  timeEstimate?: string
  /** Polish step — shown on the checklist but not counted in the progress bar. */
  optional?: boolean
}

interface UseSetupProgressParams {
  currentSeller: Seller | null
  hasLocation: boolean
  hasPublishedCourse: boolean
  /** Most recent draft course, if any — lets the course step resume it. */
  draftCourseId: string | null
  onConnectPayments: () => void
}

interface UseSetupProgressResult {
  /** Required steps — these drive the progress bar and completion. */
  steps: SetupStep[]
  /** Optional polish steps (location, logo) — shown but never block completion. */
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
  hasLocation,
  hasPublishedCourse,
  draftCourseId,
  onConnectPayments,
}: UseSetupProgressParams): UseSetupProgressResult {
  return useMemo(() => {
    const seller = currentSeller

    // Required steps — the two actions that actually gate taking a paid
    // booking: connect payouts (the KYC long pole) and publish a course.
    // A course can be published with a free-typed location, so a saved
    // studio address is polish, not a publish blocker → it lives below.
    const steps: SetupStep[] = [
      {
        id: 'payments',
        title: 'Aktiver betalinger',
        description: 'Koble til en betalingsløsning så du kan motta betaling fra elever.',
        isComplete: !!seller?.dintero_onboarding_complete,
        actionLabel: 'Aktiver',
        actionOnClick: onConnectPayments,
        icon: CreditCard,
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
    ]

    // Optional polish — improves the storefront but isn't required to take
    // bookings, so it sits apart from the X/N progress count.
    const optionalSteps: SetupStep[] = [
      {
        id: 'location',
        title: 'Legg til studioadresse',
        description: 'Lagre en fast adresse for kursene dine.',
        isComplete: hasLocation,
        actionLabel: 'Legg til sted',
        actionHref: routes.studio,
        icon: MapPin,
        optional: true,
      },
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
  }, [currentSeller, hasLocation, hasPublishedCourse, draftCourseId, onConnectPayments])
}
