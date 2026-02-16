import React from 'react';
import { Calendar } from 'lucide-react';

export interface CourseBreadcrumbsProps {
  date: string | null;
}

/**
 * Displays course date as a pill badge
 * Student-facing, calm UI with consistent spacing
 */
export const CourseBreadcrumbs: React.FC<CourseBreadcrumbsProps> = ({
  date,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date badge with icon */}
      {date && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 text-xxs font-medium text-text-secondary">
          <Calendar className="h-3 w-3" />
          {date}
        </span>
      )}
    </div>
  );
};
