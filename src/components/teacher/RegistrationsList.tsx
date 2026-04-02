import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
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
    <div className="col-span-1 md:col-span-3 lg:col-span-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">Siste påmeldinger</h2>
        <Link
          to="/teacher/signups"
          className="text-xs font-medium text-muted-foreground hover:text-foreground smooth-transition"
        >
          Se alle
        </Link>
      </div>

      <Card className="overflow-hidden">
      {displayedRegistrations.length === 0 ? (
        /* Empty State */
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="size-10 rounded-lg border border-border bg-background flex items-center justify-center mb-3">
            <UserPlus className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Ingen nye påmeldinger</p>
          <p className="text-xs text-muted-foreground mt-1">Nye påmeldinger vises her.</p>
        </div>
      ) : (
        /* Activity Feed - Simple list rows */
        <div className="px-2 py-3 divide-y divide-border">
          {displayedRegistrations.map((registration) => {
            const dayName = extractDayName(registration.courseTime);
            const startTime = extractTimeFromSchedule(registration.courseTime)?.time ?? '';

            return (
              <Link
                key={registration.id}
                to="/teacher/signups"
                className={cn(
                  "flex items-center justify-between gap-4 p-3 rounded-lg group hover:bg-muted smooth-transition relative focus-visible:ring-2 focus-visible:ring-ring/50 outline-none",
                  // Left accent for exception rows (payment failed, offer expiring, pending payment)
                  registration.hasException && "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-warning"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {registration.participant.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <span className="truncate">{registration.course}</span>
                    <span className="text-muted-foreground mx-1.5">·</span>
                    <span className="truncate">
                      {dayName}{startTime && ` kl. ${startTime}`}
                    </span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {registration.registeredAt}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </Card>
    </div>
  );
});
