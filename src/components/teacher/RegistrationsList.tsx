import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractDayName } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { Registration } from '@/types/dashboard';

interface RegistrationsListProps {
  registrations: Registration[];
}

/** Maximum age in days for a signup to appear in the "recent" feed */
const MAX_AGE_DAYS = 7;

/**
 * Check if a signup is within the recent window (last 7 days)
 */
const isRecentSignup = (createdAt: string): boolean => {
  const signupDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - signupDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= MAX_AGE_DAYS;
};

/**
 * Dashboard Activity Feed: Recent Signups
 *
 * Design intent: A lightweight, skimmable activity feed — NOT a data table.
 * Two-line card format per row:
 *   Line 1: Name (primary) + Timestamp (tertiary, right)
 *   Line 2: Course + Day badge (secondary metadata)
 *
 * Only shows signups from the last 7 days to keep the feed fresh and relevant.
 * Each signup renders as an individual mini-card with border for visual separation.
 */
export const RegistrationsList = memo(function RegistrationsList({ registrations }: RegistrationsListProps) {
  // Filter to recent signups (last 7 days), then limit to 3
  const displayedRegistrations = useMemo(() => {
    return registrations
      .filter(r => isRecentSignup(r.createdAt))
      .slice(0, 3);
  }, [registrations]);

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-5 sm:p-6 pb-3">
        <h3 className="font-geist text-sm font-medium text-text-primary">Siste påmeldinger</h3>
        <Link
          to="/teacher/signups"
          className="text-xs font-medium text-text-tertiary hover:text-text-primary smooth-transition"
        >
          Se alle
        </Link>
      </div>

      {displayedRegistrations.length === 0 ? (
        /* Empty State */
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl bg-surface/30 border border-zinc-200">
            <div className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center mb-3">
              <UserPlus className="w-4 h-4 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary">Ingen nye påmeldinger</p>
            <p className="text-xs text-text-secondary mt-1">Nye påmeldinger vises her.</p>
          </div>
        </div>
      ) : (
        /* Activity Feed - Individual card-style rows */
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {displayedRegistrations.map((registration) => {
            const dayName = extractDayName(registration.courseTime);
            const startTime = extractTimeFromSchedule(registration.courseTime)?.time ?? '';

            return (
              <Link
                key={registration.id}
                to="/teacher/signups"
                className={cn(
                  "block p-3.5 rounded-lg border border-zinc-100 bg-surface/30 hover:bg-zinc-50 smooth-transition relative overflow-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white outline-none",
                  // Left accent for exception rows (payment failed, offer expiring, pending payment)
                  registration.hasException && "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-warning"
                )}
              >
                {/* Line 1: Name + Timestamp */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {registration.participant.name}
                  </span>
                  <span className="text-xs text-text-tertiary flex-shrink-0">
                    {registration.registeredAt}
                  </span>
                </div>

                {/* Line 2: Day + Time · Course + Icon */}
                <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                  <Calendar className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                  <span className="truncate">
                    {dayName}{startTime && ` kl. ${startTime}`}
                  </span>
                  {(dayName || startTime) && <span className="text-text-tertiary mx-1.5">·</span>}
                  <span className="truncate">{registration.course}</span>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
});
