import React from 'react';

export interface BookingSummaryProps {
  course: {
    image_url: string | null;
    title: string;
    price: number | null;
  };
  dateInfo: {
    shortDate: string;
  };
  time: string;
  location: string | null;
}

/**
 * Booking summary shown in Step 2
 * Displays course thumbnail, metadata, and price breakdown
 */
export const BookingSummary: React.FC<BookingSummaryProps> = ({
  course,
  dateInfo,
  time,
  location,
}) => {
  const displayPrice = course.price || 0;

  return (
    <div className="space-y-6">
      <h3 className="font-geist text-lg font-medium text-text-primary">Sammendrag</h3>

      {/* Course preview */}
      <div className="flex gap-4 border-b border-zinc-200 pb-5">
        {course.image_url && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
            <img
              src={course.image_url}
              className="h-full w-full object-cover"
              alt={course.title}
            />
          </div>
        )}
        <div>
          <h4 className="font-medium text-text-primary leading-tight">
            {course.title}
          </h4>
          <p className="mt-1 text-xs text-text-secondary">
            {dateInfo.shortDate} {time && `Kl ${time}`}
          </p>
          {location && (
            <p className="text-xs text-text-secondary">{location}</p>
          )}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="space-y-3 py-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Kursavgift</span>
          <span className="font-medium text-text-primary">{displayPrice} kr</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Servicegebyr</span>
          <span className="font-medium text-text-primary">0 kr</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-zinc-200 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <span className="font-medium text-text-primary">Totalt å betale</span>
          <span className="font-geist text-xl font-medium text-text-primary tracking-tight">
            {displayPrice} kr
          </span>
        </div>
      </div>
    </div>
  );
};
