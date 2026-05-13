import { useMemo } from 'react'
import { User, CreditCard, BookOpen } from '@/lib/icons'
import type { LucideIcon } from '@/lib/icons'
import type { Seller } from '@/types/database'
import type { Profile } from '@/types/database'
import { routes } from '@/lib/routes'

export interface SetupStep {
  id: 'profile' | 'payments' | 'course'
  title: string
  description: string
  isComplete: boolean
  actionLabel: string
  actionHref?: string
  actionOnClick?: () => void
  icon: LucideIcon
  timeEstimate?: string
}

interface UseSetupProgressParams {
  currentSeller: Seller | null
  profile: Profile | null
  hasCourses: boolean
  onConnectPayments: () => void
}

interface UseSetupProgressResult {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
  isSetupComplete: boolean
  nextStep: SetupStep | null
  motivationalSubtitle: string
}

function getMotivationalSubtitle(completedCount: number, totalCount: number): string {
  const remaining = totalCount - completedCount
  if (remaining === 0) return 'Du er klar til å ta imot påmeldinger og betaling'
  if (remaining === 1) return 'Nesten der — ett steg igjen'
  return `${remaining} steg igjen før du kan ta imot påmeldinger`
}

export function useSetupProgress({
  currentSeller,
  profile,
  hasCourses,
  onConnectPayments,
}: UseSetupProgressParams): UseSetupProgressResult {
  return useMemo(() => {
    const seller = currentSeller
    const hasName = !!profile?.name?.trim()

    const steps: SetupStep[] = [
      {
        id: 'profile',
        title: 'Profilen din er klar',
        description: 'Navnet ditt er registrert.',
        isComplete: hasName,
        actionLabel: 'Fullfør profil',
        actionHref: routes.settingsProfile,
        icon: User,
      },
      {
        id: 'payments',
        title: 'Aktiver betalinger',
        description: 'Koble til en betalingsløsning så du kan motta betaling fra elever. Trygt og sikkert.',
        isComplete: !!seller?.dintero_onboarding_complete,
        actionLabel: 'Aktiver',
        actionOnClick: onConnectPayments,
        icon: CreditCard,
      },
      {
        id: 'course',
        title: 'Opprett ditt første kurs',
        description: 'Legg ut et kurs, så kan elevene melde seg på.',
        isComplete: hasCourses,
        actionLabel: 'Opprett kurs',
        actionHref: routes.coursesNew,
        icon: BookOpen,
        timeEstimate: 'ca. 3 min',
      },
    ]

    const completedCount = steps.filter((s) => s.isComplete).length
    const totalCount = steps.length
    const nextStep = steps.find((s) => !s.isComplete) || null
    const motivationalSubtitle = getMotivationalSubtitle(completedCount, totalCount)

    return {
      steps,
      completedCount,
      totalCount,
      isSetupComplete: completedCount === totalCount,
      nextStep,
      motivationalSubtitle,
    }
  }, [currentSeller, profile, hasCourses, onConnectPayments])
}
