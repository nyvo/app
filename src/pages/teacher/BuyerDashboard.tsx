import { motion } from 'framer-motion'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { pageVariants, pageTransition } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthContext'
import { resolveDisplayName } from '@/lib/utils'

/**
 * Buyer-side /overview placeholder. The full buyer dashboard (signups list,
 * favourites, reminders) is deferred per post-mvp-feedback §12; this gives
 * logged-in buyers a coherent landing surface instead of the half-broken
 * seller dashboard they'd see otherwise.
 */
export default function BuyerDashboard() {
  const { profile } = useAuth()
  const firstName = resolveDisplayName(profile?.name, profile?.email).split(' ')[0]

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title="Oversikt" />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <header className="mb-12">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              {firstName ? `Hei, ${firstName}` : 'Oversikt'}
            </h1>
          </header>

          <div className="rounded-xl border border-border bg-background p-6 sm:p-10">
            <EmptyState
              title="Ingen påmeldinger ennå"
              description="Når du melder deg på et kurs vil du finne det her."
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
