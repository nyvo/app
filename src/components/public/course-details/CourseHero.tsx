import React from 'react';

export interface CourseHeroProps {
  title: string;
  description: string | null;
  spotsAvailable?: number;
}

/**
 * Course title with availability indicator
 * Description is handled by CourseDescription component
 */
export const CourseHero: React.FC<CourseHeroProps> = ({ title, spotsAvailable }) => {
  // Availability badge
  const getAvailabilityLabel = () => {
    if (spotsAvailable === undefined) return null;
    if (spotsAvailable === 0) return { text: 'Fullt', dotClass: 'bg-muted-foreground' };
    if (spotsAvailable <= 3) return { text: `${spotsAvailable} ${spotsAvailable === 1 ? 'plass' : 'plasser'} igjen`, dotClass: 'bg-status-warning-text' };
    return { text: 'Ledige plasser', dotClass: 'bg-status-confirmed-text' };
  };

  const availability = getAvailabilityLabel();

  return (
    <div>
      {availability && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium mb-4">
          <span className={`w-1.5 h-1.5 rounded-full ${availability.dotClass}`} />
          {availability.text}
        </div>
      )}
      <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground">
        {title}
      </h1>
    </div>
  );
};
