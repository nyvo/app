import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeekStats } from '@/services/dashboardStats'
import { DeltaChip } from './DeltaChip'

interface BusinessGlanceCardProps {
  stats: WeekStats | null
}

export function BusinessGlanceCard({ stats }: BusinessGlanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nøkkeltall</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-muted-foreground tracking-wide">Siste 7 dager</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? <BusinessGlanceBody stats={stats} /> : <BusinessGlanceSkeleton />}
      </CardContent>
    </Card>
  )
}

function BusinessGlanceBody({ stats }: { stats: WeekStats }) {
  const capacityPercent = stats.capacityFilled.percent
  const formattedCapacity =
    stats.capacityFilled.capacity === 0
      ? '—'
      : `${capacityPercent.toFixed(1).replace('.', ',')} %`

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      <Kpi
        label="Kapasitet fylt"
        value={formattedCapacity}
        delta={<DeltaChip delta={stats.deltas.capacityFilled} />}
      />
      <Kpi
        label="Avbestillinger"
        value={stats.cancellations.toString()}
        delta={<DeltaChip delta={stats.deltas.cancellations} invert />}
      />
      <Kpi
        label="Økter"
        value={stats.sessions.toString()}
        delta={<DeltaChip delta={stats.deltas.sessions} />}
      />
      <Kpi label="Ikke møtt" value="—" delta={null} />
      <Kpi label="Avtaler" value="—" delta={null} />
      <Kpi
        label="Refusjoner"
        value={stats.refunds.toString()}
        delta={<DeltaChip delta={stats.deltas.refunds} invert />}
      />
    </div>
  )
}

function BusinessGlanceSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

function Kpi({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {delta}
      </div>
    </div>
  )
}
