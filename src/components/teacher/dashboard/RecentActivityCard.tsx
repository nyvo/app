import { Link } from 'react-router-dom'
import { UserPlus, type LucideIcon } from '@/lib/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTimePast } from '@/utils/dateFormatting'
import { routes } from '@/lib/routes'
import type { SignupWithDetails } from '@/services/signups'

interface RecentActivityCardProps {
  signups: SignupWithDetails[] | null
}

interface ActivityItem {
  id: string
  courseId: string | null
  icon: LucideIcon
  title: string
  description: string
  timestamp: string
  sortKey: number
}

function buildActivity(signups: SignupWithDetails[]): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const s of signups) {
    const createdAt = s.created_at ?? ''
    const name = s.profile?.name || s.participant_name || 'Ukjent deltaker'
    const courseTitle = s.course?.title
    items.push({
      id: `signup-${s.id}`,
      courseId: s.course?.id ?? null,
      icon: UserPlus,
      title: name,
      description: courseTitle ? `Meldte seg på ${courseTitle}` : 'Ny påmelding',
      timestamp: createdAt ? formatRelativeTimePast(createdAt) : '',
      sortKey: createdAt ? new Date(createdAt).getTime() : 0,
    })
  }

  return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 5)
}

export function RecentActivityCard({ signups }: RecentActivityCardProps) {
  const loading = signups === null

  return (
    <section>
      <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">Siste aktivitet</h2>
      {loading ? <ActivitySkeleton /> : <ActivityBody signups={signups} />}
    </section>
  )
}

function ActivityBody({ signups }: { signups: SignupWithDetails[] }) {
  const items = buildActivity(signups)

  if (items.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Ingen aktivitet ennå"
        description="Nye påmeldinger vises her."
      />
    )
  }

  const rowClass =
    'group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted'

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        const body = (
          <>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-1 truncate text-sm text-foreground-muted">{item.description}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-foreground-muted">
              {item.timestamp}
            </span>
          </>
        )

        return item.courseId ? (
          <Link key={item.id} to={routes.course(item.courseId)} className={rowClass}>
            {body}
          </Link>
        ) : (
          <div key={item.id} className={rowClass}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  )
}
