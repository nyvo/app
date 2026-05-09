import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { extractDayName } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { Registration } from '@/types/dashboard';
import { routes } from '@/lib/routes';

interface RegistrationsListProps {
  registrations: Registration[];
  hideHeader?: boolean;
  hideCard?: boolean;
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
export const RegistrationsList = memo(function RegistrationsList({ registrations, hideHeader = false, hideCard = false }: RegistrationsListProps) {
  // Filter to recent signups (last 7 days), then limit to 3
  const displayedRegistrations = useMemo(() => {
    return registrations
      .filter(r => isRecentSignup(r.createdAt))
      .slice(0, 3);
  }, [registrations]);

  const content = displayedRegistrations.length === 0 ? (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Ingen nye påmeldinger</p>
      <p className="text-xs text-foreground-muted">Nye påmeldinger vises her.</p>
    </div>
  ) : (
    <div className={cn("divide-y divide-border", hideCard ? "" : "px-3 py-3")}>
      {displayedRegistrations.map((registration) => {
        const dayName = extractDayName(registration.courseTime);
        const startTime = extractTimeFromSchedule(registration.courseTime)?.time ?? '';

        return (
          <Link
            key={registration.id}
            to={routes.signups}
            className={cn(
              "group relative flex items-center justify-between gap-4 rounded-lg px-4 py-3 outline-none smooth-transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
              registration.hasException && "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-warning"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {registration.participant.name}
              </p>
              <p className="text-sm mt-0.5 flex items-center gap-1.5 text-foreground-muted">
                <span className="truncate">{registration.course}</span>
                <span className="text-foreground-muted mx-1.5">·</span>
                <span className="truncate">
                  {dayName}{startTime && ` kl. ${startTime}`}
                </span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs tabular-nums text-foreground-tertiary">
                {registration.registeredAt}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col">
      {!hideHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Siste påmeldinger</h2>
          <Link
            to={routes.signups}
            className="text-xs font-medium tracking-wide text-foreground-muted smooth-transition hover:text-foreground"
          >
            Se alle
          </Link>
        </div>
      )}
      {hideCard ? content : <Card className="overflow-hidden">{content}</Card>}
    </div>
  );
});
