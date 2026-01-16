import { UserCheck, TrendingUp } from 'lucide-react';
import type { TeacherStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: TeacherStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const isEmpty = stats.activeStudents === 0 && stats.attendanceRate === 0;

  if (isEmpty) {
    return (
      <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-6">
        {/* Active Students - Empty State */}
        <div className="relative h-[168px] rounded-3xl bg-white p-6 shadow-sm overflow-hidden group">
          {/* Subtle background decoration */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-surface-elevated blur-3xl"></div>

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
                <UserCheck className="h-5 w-5 text-text-tertiary" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-text-tertiary mb-1">Aktive studenter</span>
              <span className="font-geist text-sm font-medium text-muted-foreground">
                Starter etter første økt
              </span>
            </div>
          </div>
        </div>

        {/* Attendance - Empty State with Mock Chart */}
        <div className="relative h-[168px] rounded-3xl bg-white p-6 shadow-sm overflow-hidden group">
          {/* Subtle background decoration */}
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-surface-elevated blur-3xl"></div>

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Oppmøte</p>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-geist text-sm font-medium text-muted-foreground">
                    Din vekstkurve
                  </span>
                </div>
              </div>
            </div>

            {/* Mock growth chart skeleton */}
            <div className="flex h-12 items-end gap-2 mt-2">
              {[30, 45, 35, 60, 75, 55].map((height, index) => (
                <div
                  key={index}
                  className="w-1/6 rounded-t-sm bg-surface-elevated"
                  style={{ height: `${height}%` }}
                  aria-label={`Potential growth day ${index + 1}`}
                />
              ))}
            </div>

            <p className="text-xxs text-text-tertiary mt-2">
              Analyser aktiveres etter din første økt
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-6">
      <div className="h-[168px] rounded-3xl bg-white p-6 shadow-sm ios-ease hover:shadow-md flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground group-hover:bg-surface transition-colors">
            <UserCheck className="h-5 w-5 text-text-secondary" />
          </div>
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Denne uken</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground font-medium">Aktive studenter</span>
          <div className="flex items-baseline gap-2">
            <span className="font-geist text-3xl font-medium tracking-tight text-text-primary mt-1">
              {stats.activeStudents}
            </span>
            <span className="text-xs font-medium text-growth-text bg-growth-bg px-1.5 py-0.5 rounded">+12%</span>
          </div>
        </div>
      </div>

      <div className="h-[168px] rounded-3xl bg-white p-6 shadow-sm ios-ease hover:shadow-md flex flex-col justify-between group">
        <div>
          <p className="text-sm text-muted-foreground font-medium">Oppmøte</p>
          <div className="flex items-end gap-2 mt-1">
            <h3 className="font-geist text-3xl font-medium tracking-tight text-text-primary">
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
                index === 4 ? 'bg-text-primary shadow-sm' : index === 3 ? 'bg-ring group-hover:bg-text-tertiary' : 'bg-surface-elevated group-hover:bg-border'
              } transition-colors ${index === 0 ? 'delay-75' : index === 1 ? 'delay-100' : index === 2 ? 'delay-150' : index === 3 ? 'delay-200' : index === 5 ? 'delay-300' : ''}`}
              style={{ height: `${value}%` }}
              aria-label={`Day ${index + 1}: ${value}% attendance`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
