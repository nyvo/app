import { UserPlus, type LucideIcon } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTimePast } from '@/utils/dateFormatting'
import { toSignupDisplay } from '@/utils/signupDisplay'
import { useSignupDrawer } from '@/contexts/SignupDrawerContext'
import type { SignupWithDetails } from '@/services/signups'

interface RecentActivityCardProps {
  signups: SignupWithDetails[] | null
  /** Called after the drawer mutates a signup (cancel, mark paid).
   *  Dashboard refetch usually feeds this. */
  onMutate?: () => void
}

interface ActivityItem {
  id: string
  signup: SignupWithDetails
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
      signup: s,
      icon: UserPlus,
      title: name,
      description: courseTitle ? `Meldte seg på ${courseTitle}` : 'Ny påmelding',
      timestamp: createdAt ? formatRelativeTimePast(createdAt) : '',
      sortKey: createdAt ? new Date(createdAt).getTime() : 0,
    })
  }

  return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 5)
}

export function RecentActivityCard({ signups, onMutate }: RecentActivityCardProps) {
  const loading = signups === null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siste aktivitet</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-muted-foreground tracking-wide">Denne måneden</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ActivitySkeleton />
        ) : (
          <ActivityBody signups={signups} onMutate={onMutate} />
        )}
      </CardContent>
    </Card>
  )
}

function ActivityBody({
  signups,
  onMutate,
}: {
  signups: SignupWithDetails[]
  onMutate?: () => void
}) {
  const { open: openDrawer } = useSignupDrawer()
  const items = buildActivity(signups)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Ingen aktivitet ennå</p>
        <p className="text-xs text-muted-foreground">Nye påmeldinger vises her</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => openDrawer(toSignupDisplay(item.signup), { onMutate })}
            className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none smooth-transition hover:bg-muted/50 focus-visible:bg-muted/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.description}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
              {item.timestamp}
            </span>
          </button>
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
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1.5 h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  )
}
