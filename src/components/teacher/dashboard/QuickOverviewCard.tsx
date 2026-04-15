import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKroner } from '@/lib/utils'
import { parseLocalDate } from '@/utils/dateUtils'
import type { MonthStats } from '@/services/dashboardStats'
import { DeltaChip } from './DeltaChip'

interface QuickOverviewCardProps {
  stats: MonthStats | null
}

const chartConfig = {
  revenue: { label: '', color: 'var(--chart-2)' },
} satisfies ChartConfig

function formatTooltipDate(dateKey: string): string {
  const parsed = parseLocalDate(dateKey)
  if (!parsed) return dateKey
  const date = new Date(parsed.year, parsed.month - 1, parsed.day)
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }).replace('.', '')
}

function formatRevenueTooltip(value: number): string {
  return value === 0 ? 'Ingen inntekter' : formatKroner(value)
}

export function QuickOverviewCard({ stats }: QuickOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Oversikt</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="text-muted-foreground tracking-wide">Denne måneden</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {stats ? <QuickOverviewBody stats={stats} /> : <QuickOverviewSkeleton />}
      </CardContent>
    </Card>
  )
}

function QuickOverviewBody({ stats }: { stats: MonthStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-5">
      <div className="rounded-lg border border-border bg-muted/30 p-4 sm:order-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          Inntekter per dag
        </span>

        <ChartContainer config={chartConfig} className="mt-3 aspect-auto h-40 w-full">
          <AreaChart
            data={stats.series}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="quick-overview-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, 'dataMax + 1']} />
            <ChartTooltip
              cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatTooltipDate(String(label))}
                  formatter={(value) => formatRevenueTooltip(Number(value))}
                  hideIndicator
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
              fill="url(#quick-overview-fill)"
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: 'var(--background)',
                fill: 'var(--color-chart-2)',
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:order-2 sm:grid-cols-1 sm:gap-4 sm:min-w-36">
        <Kpi
          label="Inntekter"
          value={formatKroner(stats.revenue)}
          delta={<DeltaChip delta={stats.deltas.revenue} />}
        />
        <Kpi
          label="Nye elever"
          value={stats.newCustomers.toString()}
          delta={<DeltaChip delta={stats.deltas.newCustomers} />}
        />
        <Kpi
          label="Påmeldinger"
          value={stats.totalSignups.toString()}
          delta={<DeltaChip delta={stats.deltas.totalSignups} />}
        />
        <Kpi label="Førstegangsbesøk" value="—" delta={null} />
      </div>
    </div>
  )
}

function QuickOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:gap-5">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-40 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:grid-cols-1 sm:gap-4 sm:min-w-36">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-24" />
          </div>
        ))}
      </div>
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
