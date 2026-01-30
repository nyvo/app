import { memo } from 'react';
import { Skeleton, SkeletonListItem, SkeletonCard } from '@/components/ui/skeleton';

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
      {/* Screen reader only announcement */}
      <span className="sr-only">Laster dashboardinnhold</span>

      {/* Upcoming Class Card - dark hero card */}
      <SkeletonCard
        variant="dark"
        className="col-span-1 md:col-span-2 lg:col-span-2 h-[360px] p-9"
      >
        <div className="flex h-full flex-col justify-between">
          {/* Top badges */}
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-32 rounded-full bg-white/10" />
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          {/* Content area */}
          <div className="space-y-3">
            <Skeleton className="h-7 w-3/4 bg-white/10" />
            <Skeleton className="h-5 w-1/2 bg-white/10" />
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-4 w-20 bg-white/10" />
            </div>
          </div>
          {/* Bottom button */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32 rounded-lg bg-white/10" />
          </div>
        </div>
      </SkeletonCard>

      {/* Messages Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-2 rounded-3xl bg-white border border-gray-200 p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        {/* Message list items */}
        <div className="space-y-1">
          <SkeletonListItem hasAvatar lines={2} />
          <SkeletonListItem hasAvatar lines={2} />
          <SkeletonListItem hasAvatar lines={2} />
          <SkeletonListItem hasAvatar lines={2} />
        </div>
      </div>

      {/* Courses Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl bg-white border border-gray-200 p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Course items - horizontal row on desktop */}
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations Card */}
      <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl bg-white border border-gray-200 p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
        {/* Registration items */}
        <div className="space-y-1">
          <SkeletonListItem hasAvatar lines={2} hasAction />
          <SkeletonListItem hasAvatar lines={2} hasAction />
          <SkeletonListItem hasAvatar lines={2} hasAction />
        </div>
      </div>
    </div>
  );
});
