import { useMemo } from 'react'
import { User, CreditCard, BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Organization } from '@/types/database'

export interface SetupStep {
  id: 'profile' | 'stripe' | 'course'
  title: string
  description: string
  isComplete: boolean
  actionLabel: string
  actionHref?: string
  actionOnClick?: () => void
  icon: LucideIcon
}

interface UseSetupProgressParams {
  currentOrganization: Organization | null
  hasCourses: boolean
  onConnectStripe: () => void
}

interface UseSetupProgressResult {
  steps: SetupStep[]
  completedCount: number
  totalCount: number
  isSetupComplete: boolean
}

export function useSetupProgress({
  currentOrganization,
  hasCourses,
  onConnectStripe,
}: UseSetupProgressParams): UseSetupProgressResult {
  return useMemo(() => {
    const org = currentOrganization

    const steps: SetupStep[] = [
      {
        id: 'profile',
        title: 'Fullfør offentlig profil',
        description: 'Legg til by så elevene finner deg.',
        isComplete: !!org?.city?.trim(),
        actionLabel: 'Fullfør profil',
        actionHref: '/teacher/profile',
        icon: User,
      },
      {
        id: 'stripe',
        title: 'Koble til Stripe',
        description: 'Motta betalinger direkte til din konto.',
        isComplete: !!org?.stripe_onboarding_complete,
        actionLabel: 'Koble til',
        actionOnClick: onConnectStripe,
        icon: CreditCard,
      },
      {
        id: 'course',
        title: 'Opprett ditt første kurs',
        description: 'Publiser et kurs så elevene kan melde seg på.',
        isComplete: hasCourses,
        actionLabel: 'Opprett kurs',
        actionHref: '/teacher/new-course',
        icon: BookOpen,
      },
    ]

    const completedCount = steps.filter((s) => s.isComplete).length
    const totalCount = steps.length

    return {
      steps,
      completedCount,
      totalCount,
      isSetupComplete: completedCount === totalCount,
    }
  }, [currentOrganization, hasCourses, onConnectStripe])
}
