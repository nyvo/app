import { memo } from 'react';
import { UserCheck } from 'lucide-react';
import type { TeacherStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: TeacherStats;
}

export const StatsCards = memo(function StatsCards({ stats }: StatsCardsProps) {
  const isEmpty = stats.activeStudents === 0 && stats.attendanceRate === 0;

  if (isEmpty) {
    return (
      <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-6">
        {/* Active Students - Empty State */}
        <div className="relative h-[168px] rounded-2xl bg-white p-6 border border-zinc-200 overflow-hidden group">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-zinc-100 text-muted-foreground">
                <UserCheck className="h-5 w-5 text-text-tertiary" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">Aktive studenter</span>
              <span className="text-xs text-text-tertiary">
                Data vises etter første økt
              </span>
            </div>
          </div>
        </div>

        {/* Attendance - Empty State with Mock Chart */}
        <div className="relative h-[168px] rounded-2xl bg-white p-6 border border-zinc-200 overflow-hidden group">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-zinc-100 text-muted-foreground">
                <BarChart2 className="h-5 w-5 text-text-tertiary" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">Oppmøte</span>
              <span className="text-xs text-text-tertiary">
                Statistikk aktiveres etter første økt
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-6">
      <div className="h-[168px] rounded-2xl bg-white p-6 border border-zinc-200 ios-ease hover:border-zinc-400 hover:bg-zinc-50/50 flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground group-hover:bg-surface transition-colors">
            <UserCheck className="h-5 w-5 text-text-secondary" />
          </div>
          <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">Denne uken</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary font-normal">Aktive studenter</span>
          <div className="flex items-baseline gap-2">
            <span className="font-geist text-3xl font-normal tracking-tight text-text-primary mt-1">
              {stats.activeStudents}
            </span>
          </div>
        </div>
      </div>

      <div className="h-[168px] rounded-2xl bg-white p-6 border border-zinc-200 ios-ease hover:border-zinc-400 hover:bg-zinc-50/50 flex flex-col justify-between group">
        <div>
          <p className="text-sm text-text-secondary font-normal">Oppmøte</p>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="font-geist text-3xl font-normal tracking-tight text-text-primary">
              {stats.attendanceRate}%
            </h3>
            <span className="text-xs text-text-tertiary mb-1.5">snitt</span>
          </div>
        </div>
        <div className="flex h-12 items-end gap-2 mt-2">
          {stats.attendanceData.map((value, index) => (
            <div
              key={index}
              className={`w-1/6 rounded-t-sm ${
                index === 4 ? 'bg-primary' : index === 3 ? 'bg-zinc-300 group-hover:bg-text-tertiary' : 'bg-surface-elevated group-hover:bg-border'
              } transition-colors ${index === 0 ? 'delay-75' : index === 1 ? 'delay-100' : index === 2 ? 'delay-150' : index === 3 ? 'delay-200' : index === 5 ? 'delay-300' : ''}`}
              style={{ height: `${value}%` }}
              aria-label={`Day ${index + 1}: ${value}% attendance`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
