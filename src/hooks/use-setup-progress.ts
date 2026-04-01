import { useMemo } from 'react'
import { User, CreditCard, BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Organization } from '@/types/database'
import type { Profile } from '@/types/database'

export interface SetupStep {
  id: 'profile' | 'stripe' | 'course'
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
  currentOrganization: Organization | null
  profile: Profile | null
  hasCourses: boolean
  onConnectStripe: () => void
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
  if (remaining === 0) return 'Du er klar til å ta imot bookinger og betaling'
  if (remaining === 1) return 'Nesten der — ett steg igjen'
  return `${remaining} steg igjen før du kan ta imot bookinger`
}

export function useSetupProgress({
  currentOrganization,
  profile,
  hasCourses,
  onConnectStripe,
}: UseSetupProgressParams): UseSetupProgressResult {
  return useMemo(() => {
    const org = currentOrganization
    const hasName = !!profile?.name?.trim()
    const hasCity = !!org?.city?.trim()

    const steps: SetupStep[] = [
      {
        id: 'profile',
        title: 'Profilen din er klar',
        description: 'Navn og by er registrert.',
        isComplete: hasName && hasCity,
        actionLabel: 'Fullfør profil',
        actionHref: '/teacher/profile',
        icon: User,
      },
      {
        id: 'stripe',
        title: 'Aktiver betalinger',
        description: 'Koble til en betalingsløsning så du kan motta betaling fra elever. Trygt og sikkert.',
        isComplete: !!org?.stripe_onboarding_complete,
        actionLabel: 'Aktiver',
        actionOnClick: onConnectStripe,
        icon: CreditCard,
      },
      {
        id: 'course',
        title: 'Opprett ditt første kurs',
        description: 'Legg ut et kurs, så kan elevene melde seg på.',
        isComplete: hasCourses,
        actionLabel: 'Opprett kurs',
        actionHref: '/teacher/new-course',
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
  }, [currentOrganization, profile, hasCourses, onConnectStripe])
}
