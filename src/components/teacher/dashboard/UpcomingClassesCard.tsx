import { Link } from 'react-router-dom'
import { CalendarPlus } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { DateBadge } from '@/components/ui/date-badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { parseLocalDate } from '@/utils/dateUtils'
import type { Course } from '@/types/dashboard'

interface UpcomingClassesCardProps {
  courses: Course[] | null
}

function getSortKey(course: Course): number {
  if (!course.date) return Infinity
  const parsed = parseLocalDate(course.date)
  if (!parsed) return Infinity
  const [h, m] = (course.time || '00:00').split(':').map(Number)
  return new Date(parsed.year, parsed.month - 1, parsed.day, h || 0, m || 0).getTime()
}

function formatFullDay(dateStr?: string): string {
  if (!dateStr) return ''
  const parsed = parseLocalDate(dateStr)
  if (!parsed) return ''
  const date = new Date(parsed.year, parsed.month - 1, parsed.day)
  const day = date.toLocaleDateString('nb-NO', { weekday: 'long' })
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function formatToday(): string {
  const today = new Date()
  const day = today.toLocaleDateString('nb-NO', { weekday: 'long' })
  const dayCap = day.charAt(0).toUpperCase() + day.slice(1)
  const dateShort = today.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', '')
  return `${dayCap} ${dateShort}`
}

export function UpcomingClassesCard({ courses }: UpcomingClassesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kommende kurs</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-muted-foreground tracking-wide">{formatToday()}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {courses === null ? <UpcomingSkeleton /> : <UpcomingBody courses={courses} />}
      </CardContent>
    </Card>
  )
}

function UpcomingBody({ courses }: { courses: Course[] }) {
  const sorted = [...courses]
    .filter((course) => course.date)
    .sort((a, b) => getSortKey(a) - getSortKey(b))
    .slice(0, 5)

  if (sorted.length === 0) {
    return (
      <Empty className="border-0 p-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarPlus />
          </EmptyMedia>
          <EmptyTitle>Ingen kommende kurs</EmptyTitle>
          <EmptyDescription>Opprett kurs for å fylle timeplanen.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-1">
      {sorted.map((course) => {
        const dayName = formatFullDay(course.date)
        const hasAttendance = course.signups != null && course.capacity != null && course.capacity > 0
        return (
          <Link
            key={`${course.id}-${course.date}-${course.time}`}
            to={`/teacher/courses/${course.id}`}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none smooth-transition hover:bg-muted/50 focus-visible:bg-muted/50"
          >
            <DateBadge dateStr={course.date} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">{course.title}</h3>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {dayName}
                {course.time ? ` · kl. ${course.time}` : ''}
                {course.subtitle ? ` · ${course.subtitle}` : ''}
              </p>
            </div>
            {hasAttendance && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {course.signups}/{course.capacity}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}
