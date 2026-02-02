import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tabVariants, tabTransition } from '@/lib/motion';
import type { CourseSession } from '@/types/database';
import { StatusIndicator } from '@/components/ui/status-indicator';

export interface SessionListProps {
  sessions: CourseSession[];
  highlightNextSession?: boolean;
}

/**
 * Session carousel for course series
 * Horizontal scroll on mobile, grid on desktop
 * Highlights next upcoming session
 */
export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  highlightNextSession = true,
}) => {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Find first upcoming session
  const now = new Date();
  const firstUpcomingIndex = sessions.findIndex((session) => {
    const sessionDate = new Date(session.session_date);
    return sessionDate >= now && session.status === 'upcoming';
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${day}. ${month}`;
  };

  // Format time (strip seconds)
  const formatTime = (time: string) => {
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  // Get status badge variant (date-aware)
  const getStatusVariant = (session: CourseSession, isNext: boolean = false) => {
    // If session date is in the past, show as completed regardless of database status
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only, not times
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate < today && session.status !== 'cancelled') {
      return { variant: 'neutral' as const, label: 'Fullført' };
    }

    switch (session.status) {
      case 'upcoming':
        // If this is the next session, show "Neste økt" instead of "Kommende"
        return { variant: 'success' as const, label: isNext ? 'Neste økt' : 'Kommende' };
      case 'completed':
        return { variant: 'neutral' as const, label: 'Fullført' };
      case 'cancelled':
        return { variant: 'error' as const, label: 'Avlyst' };
      default:
        return { variant: 'neutral' as const, label: session.status };
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // Scroll to content when opening, back to header when closing
    setTimeout(() => {
      if (newIsOpen) {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-4" ref={headerRef}>
      {/* Accordion Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-surface/30 hover:bg-surface/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-text-primary">Økter</h2>
          <span className="text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-white">
            {sessions.length} {sessions.length === 1 ? 'økt' : 'økter'}
          </span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-text-tertiary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Session carousel - horizontal scroll on mobile, grid on desktop */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            ref={contentRef}
            key="sessions"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tabTransition}
            className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible"
          >
            <div className="flex gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 snap-x snap-mandatory md:snap-none">
          {sessions.map((session, index) => {
            const isNextSession = highlightNextSession && index === firstUpcomingIndex;
            const statusBadge = getStatusVariant(session, isNextSession);

            return (
              <div
                key={session.id}
                className={`snap-start shrink-0 w-64 md:w-auto rounded-xl border p-4 transition-all ${
                  isNextSession
                    ? 'ring-2 ring-status-confirmed-border border-transparent bg-white'
                    : 'border-gray-200 bg-surface/30 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      Økt {session.session_number}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(session.session_date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(session.start_time)}
                      {session.end_time && ` - ${formatTime(session.end_time)}`}
                    </div>
                  </div>

                  <StatusIndicator
                    variant={statusBadge.variant}
                    label={statusBadge.label}
                    size="xs"
                    mode="badge"
                  />
                </div>

                {session.notes && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {session.notes}
                  </p>
                )}
              </div>
            );
          })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
