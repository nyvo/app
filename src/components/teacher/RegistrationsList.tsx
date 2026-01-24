import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractDayName, extractTimeFromSchedule } from '@/utils/dateFormatting';
import type { Registration } from '@/types/dashboard';

interface RegistrationsListProps {
  registrations: Registration[];
}

/**
 * Dashboard Activity Feed: Recent Signups
 *
 * Design intent: A lightweight, skimmable activity feed — NOT a data table.
 * Two-line card format per row:
 *   Line 1: Name (primary) + Timestamp (tertiary, right)
 *   Line 2: Course + Day badge (secondary metadata)
 *
 * Each signup renders as an individual mini-card with border for visual separation.
 */
export const RegistrationsList = memo(function RegistrationsList({ registrations }: RegistrationsListProps) {
  // Limit to 3 most recent for a compact feed
  const displayedRegistrations = registrations.slice(0, 3);

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl bg-white border border-gray-200 overflow-hidden ios-ease hover:border-ring">
      {/* Card Header */}
      <div className="flex items-center justify-between p-5 sm:p-6 pb-3">
        <h3 className="font-geist text-sm font-medium text-text-primary">Siste påmeldinger</h3>
        <Link
          to="/teacher/signups"
          className="text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors"
        >
          Se alle
        </Link>
      </div>

      {registrations.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-10 px-6">
          <p className="text-sm text-text-secondary">Ingen påmeldinger ennå</p>
        </div>
      ) : (
        /* Activity Feed - Individual card-style rows */
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {displayedRegistrations.map((registration) => {
            const dayName = extractDayName(registration.courseTime);
            const startTime = extractTimeFromSchedule(registration.courseTime);

            return (
              <Link
                key={registration.id}
                to="/teacher/signups"
                className={cn(
                  "block p-3.5 rounded-2xl border border-gray-100 bg-surface/30 hover:bg-surface hover:border-gray-200 transition-colors relative overflow-hidden",
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
                <p className="flex items-center gap-1.5 text-xs leading-none text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                  <span className="truncate">
                    {dayName}{startTime && ` kl. ${startTime}`}
                  </span>
                  {(dayName || startTime) && <span className="text-text-tertiary mx-1.5">·</span>}
                  <Leaf className="h-3 w-3 text-text-tertiary flex-shrink-0" />
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
