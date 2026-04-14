import { memo } from 'react';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

/**
 * Dashboard Skeleton - matches the Primary Row + 2-col grid layout
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Laster oversikten"
      className="space-y-6"
    >
      <span className="sr-only">Laster innhold</span>

      {/* Primary Row — 2 fixed Bento cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[...Array(2)].map((_, i) => (
          <SkeletonCard key={i} className="min-h-[100px] sm:min-h-[112px] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-12" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Two-column grid: Left (activities + messages), Right (today + registrations) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr] xl:items-start">
        {/* Left column */}
        <div className="space-y-6">
          {/* Upcoming activities */}
          <div>
            <Skeleton className="mb-3 h-5 w-32" />
            <SkeletonCard className="p-4">
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-3">
                    <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-28 max-w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>

          {/* Messages */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
            <SkeletonCard className="p-3">
              <div className="space-y-0 divide-y divide-border/30">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-1 py-2.5">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <Skeleton className="h-4 w-24 max-w-full" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Today */}
          <div>
            <Skeleton className="mb-3 h-5 w-16" />
            <SkeletonCard className="p-4">
              <div className="flex items-center gap-3 py-3">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-4 w-28 max-w-full" />
              </div>
            </SkeletonCard>
          </div>

          {/* Registrations */}
          <div>
            <Skeleton className="mb-3 h-5 w-24" />
            <SkeletonCard className="p-4">
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28 max-w-full" />
                      <Skeleton className="h-3 w-20 max-w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  );
});
