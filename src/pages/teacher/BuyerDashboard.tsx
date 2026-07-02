import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImageIcon } from '@/lib/icons'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { pageVariants, pageTransition } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthContext'
import { claimMySignups, fetchMySignups, type BuyerSignup } from '@/services/signups'
import { routes } from '@/lib/routes'
import { formatKroner, resolveDisplayName } from '@/lib/utils'
import { toLocalDate } from '@/utils/dateUtils'
import { extractTimeFromSchedule } from '@/utils/timeExtraction'
import { logger } from '@/lib/logger'

/**
 * Buyer-side /overview — the claimed-bookings list (buyer accounts V2).
 * One query: signups where buyer_id = the current user (claim_my_signups
 * backfills the column at session start). Kommende/Tidligere sectioned
 * list per the Time2book/Preply pattern; no self-cancel (buyer UPDATE RLS
 * was dropped in 20260606100000 — a future cancel must be a column-scoped
 * RPC, not a button here).
 */

const WEEKDAYS_SHORT = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const

// "man. 2. feb" (+ year when it isn't the current one). Null on bad input so
// rows without a date just omit the line.
function formatCourseDate(dateString: string | null): string | null {
  if (!dateString) return null
  const d = toLocalDate(dateString)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}${year}`
}

// A signup is "past" when the course's last relevant date is before today.
// Undated courses stay in Kommende — better to over-show than bury an
// active booking. Cancelled rows always sort under Tidligere.
function isPastSignup(signup: BuyerSignup, today: Date): boolean {
  if (signup.status !== 'confirmed') return true
  const relevant = signup.course?.end_date ?? signup.course?.start_date
  if (!relevant) return false
  const d = toLocalDate(relevant)
  if (isNaN(d.getTime())) return false
  return d < today
}

function SignupRow({ signup }: { signup: BuyerSignup }) {
  const course = signup.course
  const teamSlug = course?.seller?.slug ?? null
  const sellerName = course?.seller?.name ?? null

  const dateLine = formatCourseDate(course?.start_date ?? null)
  const time = extractTimeFromSchedule(course?.time_schedule)?.time ?? null
  const whenLine = [dateLine, time ? `kl. ${time}` : null].filter(Boolean).join(' · ')

  const isCancelled = signup.status === 'cancelled'
  const isCourseCancelled = signup.status === 'course_cancelled'

  const courseUrl = teamSlug && course?.slug ? routes.publicCourse(teamSlug, course.slug) : null

  return (
    <li className="flex items-start gap-4 p-3.5 sm:items-center">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {course?.image_url ? (
          <img src={course.image_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-foreground-muted">
            <ImageIcon className="size-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {courseUrl ? (
            <Link
              to={courseUrl}
              className="truncate text-base font-medium text-foreground hover:underline underline-offset-2"
            >
              {course?.title ?? 'Kurs'}
            </Link>
          ) : (
            <p className="truncate text-base font-medium text-foreground">
              {course?.title ?? 'Kurs'}
            </p>
          )}
          {(isCancelled || isCourseCancelled) && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {isCourseCancelled ? 'Avlyst' : 'Avmeldt'}
            </span>
          )}
        </div>
        {whenLine && (
          <p className="mt-0.5 text-sm text-foreground-muted tabular-nums">{whenLine}</p>
        )}
        {sellerName && (
          teamSlug ? (
            <Link
              to={routes.publicTeam(teamSlug)}
              className="mt-0.5 inline-block truncate text-sm text-foreground-muted hover:text-foreground hover:underline underline-offset-2"
            >
              {sellerName}
            </Link>
          ) : (
            <p className="mt-0.5 truncate text-sm text-foreground-muted">{sellerName}</p>
          )
        )}
      </div>

      <div className="shrink-0 text-right">
        {signup.amount_paid !== null && (
          <p className="text-sm font-medium text-foreground tabular-nums">
            {signup.amount_paid === 0 ? 'Gratis' : formatKroner(signup.amount_paid)}
          </p>
        )}
      </div>
    </li>
  )
}

// Mirrors the SignupSection anatomy (heading + a bordered list of rows, each a
// 64px thumbnail + three text lines + trailing amount) so the layout doesn't
// jump when the single query lands.
function DashboardSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-live="polite">
      <span className="sr-only">Laster…</span>
      <section>
        <Skeleton className="mb-3 h-4 w-20" />
        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 p-3.5 sm:items-center">
              <Skeleton className="size-16 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-4 w-12 shrink-0" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function SignupSection({ title, signups }: { title: string; signups: BuyerSignup[] }) {
  if (signups.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-foreground-muted">{title}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-background">
        {signups.map((s) => (
          <SignupRow key={s.id} signup={s} />
        ))}
      </ul>
    </section>
  )
}

export default function BuyerDashboard() {
  const { user, profile } = useAuth()
  const firstName = resolveDisplayName(profile?.name, profile?.email).split(' ')[0]

  const [signups, setSignups] = useState<BuyerSignup[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // Generation counter — bumped on unmount/user-change and on each retry so a
  // stale in-flight request never lands its result over a newer one.
  const reqIdRef = useRef(0)

  const loadSignups = useCallback(async () => {
    if (!user) return
    const reqId = ++reqIdRef.current
    setLoadFailed(false)
    setSignups(null)

    // Claim before reading — the session-start claim in AuthContext is
    // fire-and-forget and may still be in flight on a first login. The RPC
    // is idempotent, so the extra call just guarantees the list is complete.
    const { error: claimError } = await claimMySignups()
    if (reqId !== reqIdRef.current) return
    if (claimError) logger.error('BuyerDashboard: claim_my_signups failed', claimError)

    const { data, error } = await fetchMySignups(user.id)
    if (reqId !== reqIdRef.current) return
    if (error) {
      logger.error('BuyerDashboard: fetchMySignups failed', error)
      setLoadFailed(true)
      return
    }
    setSignups(data ?? [])
  }, [user])

  useEffect(() => {
    void loadSignups()
    return () => {
      reqIdRef.current++
    }
  }, [loadSignups])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = (signups ?? []).filter((s) => !isPastSignup(s, today))
  const past = (signups ?? []).filter((s) => isPastSignup(s, today))

  return (
    <div className="flex-1 overflow-y-auto bg-canvas h-full">
      <MobileTeacherHeader />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <header className="mb-12">
            <h1 className="text-2xl font-medium text-foreground">
              {firstName ? `Hei, ${firstName}` : 'Oversikt'}
            </h1>
          </header>

          {loadFailed ? (
            <div className="rounded-xl border border-border bg-background p-6 sm:p-10">
              <ErrorState
                title="Kunne ikke hente påmeldingene dine"
                message="Sjekk forbindelsen og prøv igjen."
                onRetry={loadSignups}
              />
            </div>
          ) : signups === null ? (
            // Skeleton held back 200ms (Studio § 10 — no flash-loader for
            // sub-second loads) so a fast query stays quiet.
            <DelayedFallback>
              <DashboardSkeleton />
            </DelayedFallback>
          ) : signups.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-6 sm:p-10">
              <EmptyState
                title="Ingen påmeldinger ennå"
                description="Når du melder deg på et kurs vil du finne det her."
              />
            </div>
          ) : (
            <div className="space-y-10">
              <SignupSection title="Kommende" signups={upcoming} />
              <SignupSection title="Tidligere" signups={past} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
