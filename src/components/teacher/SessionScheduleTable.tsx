import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { formatSessionDate, formatTimeRange } from '@/utils/dateFormatting';
import type { SessionScheduleRow } from '@/services/courses';

interface SessionScheduleTableProps {
  sessions: SessionScheduleRow[];
}

/**
 * Determines if a session's course needs attention based on enrollment.
 *
 * Shows "Lav påmelding" when a course is starting within 7 days
 * with less than 40% enrollment.
 */
function getUrgencyInfo(session: SessionScheduleRow): { isUrgent: boolean; reason?: string } {
  if (session.courseStatus !== 'upcoming' || !session.courseStartDate) {
    return { isUrgent: false };
  }

  const now = new Date();
  const startDate = new Date(session.courseStartDate);
  const daysUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilStart < 0) {
    return { isUrgent: false };
  }

  const enrollmentRate = session.maxParticipants && session.maxParticipants > 0
    ? session.signupsCount / session.maxParticipants
    : 1;

  if (daysUntilStart <= 7 && enrollmentRate < 0.4) {
    return { isUrgent: true, reason: 'Lav påmelding' };
  }

  return { isUrgent: false };
}

/**
 * Gets the enrollment label for teacher admin view.
 */
function getEnrollmentLabel(session: SessionScheduleRow): string {
  const { signupsCount, maxParticipants } = session;

  if (!maxParticipants) return `${signupsCount} påmeldte`;
  if (signupsCount >= maxParticipants) return 'Fullt';
  return `${signupsCount}/${maxParticipants} påmeldte`;
}

/**
 * Formats price for display
 */
function formatPrice(price: number | null): string {
  if (!price) return 'Gratis';
  return `${price} kr`;
}

export function SessionScheduleTable({ sessions }: SessionScheduleTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="grid grid-cols-[minmax(120px,1fr)_minmax(100px,1fr)_minmax(160px,2fr)_minmax(140px,1.5fr)_minmax(80px,0.8fr)_48px] items-center border-b border-zinc-200 px-6 py-4">
          <span className="text-xs font-medium text-text-secondary">Dato</span>
          <span className="text-xs font-medium text-text-secondary">Tid</span>
          <span className="text-xs font-medium text-text-secondary">Kurs</span>
          <span className="text-xs font-medium text-text-secondary">Status</span>
          <span className="text-xs font-medium text-text-secondary text-right">Pris</span>
          <span />
        </div>

        {/* Rows */}
        {sessions.map((session) => {
          const enrollmentLabel = getEnrollmentLabel(session);
          const urgency = getUrgencyInfo(session);
          return (
            <div
              key={session.sessionId}
              className={`group grid grid-cols-[minmax(120px,1fr)_minmax(100px,1fr)_minmax(160px,2fr)_minmax(140px,1.5fr)_minmax(80px,0.8fr)_48px] items-center border-b border-zinc-200 last:border-b-0 px-6 py-6 smooth-transition hover:bg-zinc-50/50 cursor-pointer ${urgency.isUrgent ? 'border-l-2 border-l-amber-400' : ''}`}
              onClick={() => navigate(`/teacher/courses/${session.courseId}`)}
              role="row"
              aria-label={`${session.courseTitle}, ${formatSessionDate(session.sessionDate)}`}
            >
              {/* Date */}
              <span className="text-sm font-medium text-text-primary">
                {formatSessionDate(session.sessionDate)}
              </span>

              {/* Time */}
              <span className="text-sm text-text-secondary">
                {formatTimeRange(session.startTime, session.endTime)}
              </span>

              {/* Class name */}
              <span className="text-sm font-medium text-text-primary truncate pr-4">
                {session.courseTitle}
              </span>

              {/* Enrollment + urgency */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {enrollmentLabel}
                </span>
                {urgency.isUrgent && urgency.reason && (
                  <StatusIndicator
                    variant="warning"
                    mode="badge"
                    size="xs"
                    label={urgency.reason}
                  />
                )}
              </div>

              {/* Price */}
              <span className="text-sm text-text-primary text-right">
                {formatPrice(session.price)}
              </span>

              {/* Chevron */}
              <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary smooth-transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile view — stacked rows */}
      <div className="md:hidden">
        {sessions.map((session) => {
          const enrollmentLabel = getEnrollmentLabel(session);
          const urgency = getUrgencyInfo(session);
          return (
            <div
              key={session.sessionId}
              className={`group flex items-center gap-3 border-b border-zinc-200 last:border-b-0 px-4 py-6 smooth-transition hover:bg-zinc-50/50 cursor-pointer ${urgency.isUrgent ? 'border-l-2 border-l-amber-400' : ''}`}
              onClick={() => navigate(`/teacher/courses/${session.courseId}`)}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {session.courseTitle}
                  </p>
                  {urgency.isUrgent && urgency.reason && (
                    <StatusIndicator
                      variant="warning"
                      mode="badge"
                      size="xs"
                      label={urgency.reason}
                      className="shrink-0"
                    />
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  {formatSessionDate(session.sessionDate)} · {formatTimeRange(session.startTime, session.endTime)}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">{enrollmentLabel}</span>
                  <span className="text-xs text-text-secondary">{formatPrice(session.price)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-tertiary shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Skeleton loader matching table layout
 */
export function SessionScheduleTableSkeleton() {
  return (
    <div className="overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-8 border-b border-zinc-200 px-6 py-4">
        {[80, 60, 120, 100, 50].map((w, i) => (
          <div key={i} className="h-3 bg-surface-elevated rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-8 border-b border-zinc-200 last:border-b-0 px-6 py-6">
          <div className="h-4 w-24 bg-surface-elevated rounded" />
          <div className="h-4 w-20 bg-surface-elevated rounded" />
          <div className="h-4 w-36 bg-surface-elevated rounded" />
          <div className="h-4 w-28 bg-surface-elevated rounded" />
          <div className="h-4 w-14 bg-surface-elevated rounded" />
        </div>
      ))}
    </div>
  );
}
