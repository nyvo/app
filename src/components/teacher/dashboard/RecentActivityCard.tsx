import { Link } from 'react-router-dom'
import { UserPlus, MessageSquare, type LucideIcon } from '@/lib/icons'
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
import type { SignupWithDetails } from '@/services/signups'
import type { ConversationWithDetails } from '@/services/messages'

interface RecentActivityCardProps {
  signups: SignupWithDetails[] | null
  conversations: ConversationWithDetails[] | null
}

interface ActivityItem {
  id: string
  icon: LucideIcon
  title: string
  description: string
  timestamp: string
  sortKey: number
  href: string
}

function buildActivity(
  signups: SignupWithDetails[],
  conversations: ConversationWithDetails[]
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const s of signups) {
    const createdAt = s.created_at ?? ''
    const name = s.profile?.name || s.participant_name || 'Ukjent deltaker'
    const courseTitle = s.course?.title
    items.push({
      id: `signup-${s.id}`,
      icon: UserPlus,
      title: name,
      description: courseTitle ? `Meldte seg på ${courseTitle}` : 'Ny påmelding',
      timestamp: createdAt ? formatRelativeTimePast(createdAt) : '',
      sortKey: createdAt ? new Date(createdAt).getTime() : 0,
      href: '/teacher/signups',
    })
  }

  for (const c of conversations) {
    const updatedAt = c.updated_at ?? ''
    const name = c.participant?.name || 'Ukjent'
    items.push({
      id: `message-${c.id}`,
      icon: MessageSquare,
      title: name,
      description: 'Sendte en melding',
      timestamp: updatedAt ? formatRelativeTimePast(updatedAt) : '',
      sortKey: updatedAt ? new Date(updatedAt).getTime() : 0,
      href: '/teacher/messages',
    })
  }

  return items.sort((a, b) => b.sortKey - a.sortKey).slice(0, 5)
}

export function RecentActivityCard({ signups, conversations }: RecentActivityCardProps) {
  const loading = signups === null || conversations === null

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
          <ActivityBody signups={signups} conversations={conversations} />
        )}
      </CardContent>
    </Card>
  )
}

function ActivityBody({
  signups,
  conversations,
}: {
  signups: SignupWithDetails[]
  conversations: ConversationWithDetails[]
}) {
  const items = buildActivity(signups, conversations)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-8">
        <p className="text-sm font-medium text-foreground">Ingen aktivitet ennå</p>
        <p className="text-xs text-muted-foreground">Nye påmeldinger og meldinger vises her</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            to={item.href}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none smooth-transition hover:bg-muted/50 focus-visible:bg-muted/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.description}</p>
            </div>
            <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground">
              {item.timestamp}
            </span>
          </Link>
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
