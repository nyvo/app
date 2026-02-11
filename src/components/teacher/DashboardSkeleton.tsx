import { memo } from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

/**
 * Dashboard Skeleton - detailed placeholder matching actual dashboard layout
 * Provides visual continuity while data loads
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div
      className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-live="polite"
      aria-label="Laster dashboard"
    >
      <span className="sr-only">Laster dashboardinnhold</span>

      {/* Upcoming Class Card */}
      <SkeletonCard className="col-span-1 md:col-span-2 lg:col-span-2 h-[360px] p-6 sm:p-9">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex items-center gap-5 mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </SkeletonCard>

      {/* Messages Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-2 h-[360px] rounded-2xl bg-white border border-zinc-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 pb-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 p-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Courses Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-2xl bg-white border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center p-1">
              <div className="w-14 flex-shrink-0">
                <Skeleton className="h-4 w-10" />
              </div>
              <div className="flex-1 rounded-lg bg-surface/50 border border-zinc-100 p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-2xl bg-white border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3.5 rounded-lg border border-zinc-100 bg-surface/30">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
