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
        <div className="type-meta mb-4 inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-1 text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${availability.dotClass}`} />
          {availability.text}
        </div>
      )}
      <h1 className="type-heading-1 text-foreground">
        {title}
      </h1>
    </div>
  );
};
