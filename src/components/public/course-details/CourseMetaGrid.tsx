import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { formatDuration } from '@/components/public/courseCardUtils';

export interface CourseMetaGridProps {
  time: string;
  location: string | null;
  duration: number | null;
  dateInfo?: {
    dayName: string;
    fullDate: string;
  };
}

/**
 * Grid layout displaying course meta information (time, location, duration)
 * Each card has an icon, label, and value
 */
export const CourseMetaGrid: React.FC<CourseMetaGridProps> = ({
  time,
  location,
  duration,
  dateInfo,
}) => {
  // Extract date part from fullDate (e.g., "Mandag, 7. Jan" -> "7. Jan")
  const dateOnly = dateInfo?.fullDate.split(', ')[1] || '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Date and time card */}
      <div className="p-5 rounded-2xl border border-zinc-200 bg-surface/30">
        <div className="flex items-center gap-2 text-text-tertiary mb-2">
          <Clock className="h-4 w-4" />
          <span className="text-xxs font-medium uppercase tracking-wider">Dato og tid</span>
        </div>
        <div className="text-xl font-medium text-text-primary">
          {time} {duration && <span className="text-base">({formatDuration(duration)})</span>}
        </div>
        {dateInfo && (
          <div className="text-xs text-muted-foreground mt-3">
            {dateInfo.dayName}, {dateOnly}
          </div>
        )}
      </div>

      {/* Location card */}
      <div className="p-5 rounded-2xl border border-zinc-200 bg-surface/30">
        <div className="flex items-center gap-2 text-text-tertiary mb-2">
          <MapPin className="h-4 w-4" />
          <span className="text-xxs font-medium uppercase tracking-wider">Sted</span>
        </div>
        <div className="text-lg font-medium text-text-primary">
          {location || 'Ikke oppgitt'}
        </div>
      </div>
    </div>
  );
};
