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
        title: 'Fullfør profilen din',
        description: 'Legg til navn og by så elevene finner deg.',
        isComplete: hasName && hasCity,
        actionLabel: 'Fullfør',
        actionHref: '/teacher/profile',
        icon: User,
      },
      {
        id: 'stripe',
        title: 'Koble til Stripe',
        description: 'Motta betaling direkte til kontoen din.',
        isComplete: !!org?.stripe_onboarding_complete,
        actionLabel: 'Koble til',
        actionOnClick: onConnectStripe,
        icon: CreditCard,
      },
      {
        id: 'course',
        title: 'Opprett ditt første kurs',
        description: 'Publiser et kurs så elever kan melde seg på.',
        isComplete: hasCourses,
        actionLabel: 'Opprett',
        actionHref: '/teacher/new-course',
        icon: BookOpen,
      },
    ]

    const completedCount = steps.filter((s) => s.isComplete).length
    const totalCount = steps.length
    const nextStep = steps.find((s) => !s.isComplete) || null

    return {
      steps,
      completedCount,
      totalCount,
      isSetupComplete: completedCount === totalCount,
      nextStep,
    }
  }, [currentOrganization, profile, hasCourses, onConnectStripe])
}
