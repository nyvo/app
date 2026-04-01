import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { formatDuration } from '@/components/public/courseCardUtils';

export interface CourseMetaGridProps {
  time: string;
  location: string | null;
  address?: string | null;
  duration: number | null;
  dateInfo?: {
    dayName: string;
    fullDate: string;
  };
}

/**
 * Linear-style meta info — icon-led rows instead of cards
 * Vertical stack with lucide icons and clean typography
 */
export const CourseMetaGrid: React.FC<CourseMetaGridProps> = ({
  time,
  location,
  address,
  duration,
  dateInfo,
}) => {
  const dateOnly = dateInfo?.fullDate.split(', ')[1] || '';

  // If no explicit address prop, try splitting location on comma
  // e.g. "Studio 1, Parkveien 5, Oslo" → venue: "Studio 1", addr: "Parkveien 5, Oslo"
  let venueName = location || 'Ikke angitt';
  let venueAddress = address || null;

  if (!venueAddress && location && location.includes(',')) {
    const parts = location.split(',');
    venueName = parts[0].trim();
    venueAddress = parts.slice(1).join(',').trim();
  }

  return (
    <div className="space-y-6">
      {/* Date & time */}
      <div className="flex items-start gap-4">
        <Clock className="h-5 w-5 text-text-tertiary mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium text-text-primary">
            {dateInfo?.dayName}, {dateOnly}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            {time}{duration ? ` — ${formatDuration(duration)}` : ''}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-start gap-4">
        <MapPin className="h-5 w-5 text-text-tertiary mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-medium text-text-primary">
            {venueName}
          </div>
          {venueAddress && (
            <div className="text-sm text-text-secondary mt-1">
              {venueAddress}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
