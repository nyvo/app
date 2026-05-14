import { Link } from 'react-router-dom'
import { Clock, Users } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { parseLocalDate } from '@/utils/dateUtils'
import type { Course } from '@/types/dashboard'
import { routes } from '@/lib/routes'

interface UpcomingClassesCardProps {
  courses: Course[] | null
}

const DAY_NAMES = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const

const UPCOMING_LIMIT = 3

function toDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const parsed = parseLocalDate(dateStr)
  if (!parsed) return null
  return new Date(parsed.year, parsed.month - 1, parsed.day)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getCurrentWeekSunday(today: Date): Date {
  const day = today.getDay()
  const daysToSunday = day === 0 ? 0 : 7 - day
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToSunday)
  return sunday
}

function formatDayLabel(dateStr: string, today: Date, weekSunday: Date): string {
  const date = toDate(dateStr)
  if (!date) return ''
  const target = startOfDay(date)
  if (target.getTime() === today.getTime()) return 'I dag'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (target.getTime() === tomorrow.getTime()) return 'I morgen'
  if (target <= weekSunday) {
    const name = DAY_NAMES[target.getDay()]
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return `${target.getDate()}. ${MONTH_ABBR[target.getMonth()]}`
}

export function UpcomingClassesCard({ courses }: UpcomingClassesCardProps) {
  return (
    <section>
      <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">Neste kurs</h2>
      {courses === null ? <UpcomingSkeleton /> : <UpcomingBody courses={courses} />}
    </section>
  )
}

function UpcomingBody({ courses }: { courses: Course[] }) {
  const today = startOfDay(new Date())
  const weekSunday = getCurrentWeekSunday(today)

  const upcoming = courses
    .filter((course) => {
      const date = toDate(course.date)
      return date !== null && date >= today
    })
    .sort((a, b) => {
      const byDate = (a.date || '').localeCompare(b.date || '')
      if (byDate !== 0) return byDate
      return (a.time || '').localeCompare(b.time || '')
    })
    .slice(0, UPCOMING_LIMIT)

  if (upcoming.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Ingen kommende kurs"
        description="Opprett kurs for å fylle timeplanen."
        action={
          <Button asChild size="sm">
            <Link to={routes.coursesNew}>
              Opprett kurs
            </Link>
          </Button>
        }
      />
    )
  }

  let lastDate: string | null = null

  return (
    <div className="space-y-2">
      {upcoming.map((course) => {
        const hasAttendance =
          course.signups != null && course.capacity != null && course.capacity > 0
        const isFull = hasAttendance && course.signups! >= course.capacity!
        const showLabel = course.date !== lastDate
        lastDate = course.date ?? lastDate
        return (
          <div
            key={`${course.id}-${course.date}-${course.time}`}
            className="grid grid-cols-[theme(spacing.16)_1fr]"
          >
            <span className="pt-3 text-sm font-medium tabular-nums text-foreground-muted">
              {showLabel ? formatDayLabel(course.date!, today, weekSunday) : ''}
            </span>
            <Link
              to={routes.course(course.id)}
              className="group rounded-lg bg-muted p-3 outline-none transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/15"
            >
              <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
              <div className="mt-1 flex items-center gap-3 text-sm text-foreground-muted tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {course.time || '—'}
                </span>
                {hasAttendance && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5 shrink-0" aria-hidden="true" />
                    {course.signups}/{course.capacity}
                    {isFull && ' · Fullt'}
                  </span>
                )}
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[theme(spacing.16)_1fr]">
          <Skeleton className="h-3 w-12 mt-3" />
          <div className="p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
