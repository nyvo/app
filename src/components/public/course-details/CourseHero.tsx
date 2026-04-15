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
    if (spotsAvailable <= 3) return { text: `${spotsAvailable} ${spotsAvailable === 1 ? 'plass' : 'plasser'} igjen`, dotClass: 'bg-amber-900' };
    return { text: 'Ledige plasser', dotClass: 'bg-green-800' };
  };

  const availability = getAvailabilityLabel();

  return (
    <div>
      {availability && (
        <div className="text-xs font-medium tracking-wide mb-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${availability.dotClass}`} />
          {availability.text}
        </div>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    </div>
  );
};
