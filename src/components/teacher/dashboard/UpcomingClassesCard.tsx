import { Link } from 'react-router-dom'
import { CalendarPlus } from '@/lib/icons'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { parseLocalDate } from '@/utils/dateUtils'
import type { Course } from '@/types/dashboard'

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
    <Card>
      <CardHeader>
        <CardTitle>Neste kurs</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {courses === null ? <UpcomingSkeleton /> : <UpcomingBody courses={courses} />}
      </CardContent>
    </Card>
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
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Ingen kommende kurs</p>
          <p className="text-xs text-muted-foreground mt-1">Opprett kurs for å fylle timeplanen</p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/teacher/new-course">
            <CalendarPlus className="h-3.5 w-3.5" />
            Opprett kurs
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {upcoming.map((course) => {
        const hasAttendance = course.signups != null && course.capacity != null && course.capacity > 0
        return (
          <div key={`${course.id}-${course.date}-${course.time}`} className="grid grid-cols-[theme(spacing.16)_1fr] pl-6 pr-6">
            <span className="text-xs font-medium text-muted-foreground">
              {formatDayLabel(course.date!, today, weekSunday)}
            </span>
            <Link
              to={`/teacher/courses/${course.id}`}
              className="group rounded-lg bg-chart-2/10 outline-none smooth-transition hover:bg-chart-2/15 focus-visible:bg-chart-2/15"
            >
              <div className="p-3 space-y-0.5">
                <h3 className="truncate text-sm font-medium text-foreground">{course.title}</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {course.time ? `kl. ${course.time}` : 'Tid ikke satt'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {hasAttendance ? `${course.signups}/${course.capacity} påmeldte` : course.subtitle || 'Ingen påmeldte'}
                </p>
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
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-16 mb-1.5" />
          <Skeleton className="h-[60px] w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}
