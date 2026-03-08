import React from 'react';

export interface CourseHeroProps {
  title: string;
  description: string | null;
}

/**
 * Course title and subtitle section
 * Uses Geist font for tight tracking and modern feel
 */
export const CourseHero: React.FC<CourseHeroProps> = ({ title, description }) => {
  return (
    <div className="space-y-4">
      <h1 className="display-heading text-3xl md:text-4xl font-medium text-text-primary leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-text-secondary font-normal leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
