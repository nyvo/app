import { memo, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Mimics <Card> shell without animate-pulse on the container so inner Skeleton elements stay visible
function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-card shadow-xs ring-1 ring-foreground/10 overflow-hidden py-6">
      {children}
    </div>
  )
}

/**
 * Dashboard Skeleton — mirrors the 4-card lg:grid-cols-2 layout:
 * [RecentActivity] [QuickOverview]
 * [UpcomingClasses] [BusinessGlance]
 */
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Laster oversikten"
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      <span className="sr-only">Laster innhold</span>

      {/* RecentActivity skeleton */}
      <CardShell>
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="px-6 pt-6">
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 max-w-full" />
                  <Skeleton className="h-3 w-44 max-w-full" />
                </div>
                <Skeleton className="h-3 w-8 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </CardShell>

      {/* QuickOverview skeleton */}
      <CardShell>
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
        <div className="px-6 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-7 w-28" />
              <Skeleton className="mt-3 h-40 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 self-center sm:grid-cols-1 sm:gap-4 sm:min-w-36">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-7 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardShell>

      {/* UpcomingClasses skeleton */}
      <CardShell>
        <div className="px-6 pb-2">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="px-6 pt-6">
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardShell>

      {/* BusinessGlance skeleton */}
      <CardShell>
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="px-6 pt-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-7 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardShell>
    </div>
  );
});
