import { Link } from 'react-router-dom'
import { CalendarPlus } from '@/lib/icons'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { parseLocalDate } from '@/utils/dateUtils'
import type { Course } from '@/types/dashboard'

interface UpcomingClassesCardProps {
  courses: Course[] | null
}

const DAY_NAMES = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const

function getWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

function toDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const parsed = parseLocalDate(dateStr)
  if (!parsed) return null
  return new Date(parsed.year, parsed.month - 1, parsed.day)
}

function formatDayLabel(dateStr: string): string {
  const date = toDate(dateStr)
  if (!date) return ''
  const today = new Date()
  const isToday = date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (isToday) return 'I dag'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  if (isTomorrow) return 'I morgen'
  const name = DAY_NAMES[date.getDay()]
  return name.charAt(0).toUpperCase() + name.slice(1)
}


export function UpcomingClassesCard({ courses }: UpcomingClassesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Neste kurs</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-muted-foreground tracking-wide">Denne uken</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {courses === null ? <UpcomingSkeleton /> : <UpcomingBody courses={courses} />}
      </CardContent>
    </Card>
  )
}

function UpcomingBody({ courses }: { courses: Course[] }) {
  const { monday, sunday } = getWeekBounds()

  const thisWeek = courses.filter((course) => {
    const date = toDate(course.date)
    if (!date) return false
    return date >= monday && date <= sunday
  })

  // Group by date
  const grouped = new Map<string, Course[]>()
  for (const course of thisWeek) {
    if (!course.date) continue
    const existing = grouped.get(course.date)
    if (existing) {
      existing.push(course)
    } else {
      grouped.set(course.date, [course])
    }
  }

  // Sort groups by date, sort courses within each group by time
  const sortedDays = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [, dayCourses] of sortedDays) {
    dayCourses.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  if (sortedDays.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Ingen kurs denne uken</p>
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

  const allCourses = sortedDays.flatMap(([, dayCourses]) => dayCourses)

  return (
    <div className="space-y-3">
      {allCourses.map((course) => {
        const hasAttendance = course.signups != null && course.capacity != null && course.capacity > 0
        return (
          <div key={`${course.id}-${course.date}-${course.time}`} className="grid grid-cols-[theme(spacing.16)_1fr] pl-6 pr-6">
            <span className="text-xs font-medium text-muted-foreground">
              {formatDayLabel(course.date!)}
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
