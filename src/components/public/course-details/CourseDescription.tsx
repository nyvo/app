import React from 'react';
import { Check } from 'lucide-react';

export interface CourseDescriptionProps {
  description: string | null;
  highlights?: string[];
}

/**
 * Course description section with optional bullet points
 * Prose rendering with calm, readable styling
 */
export const CourseDescription: React.FC<CourseDescriptionProps> = ({
  description,
  highlights,
}) => {
  if (!description && (!highlights || highlights.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary">Om kurset</h2>

      {description && (
        <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed">
          <p>{description}</p>
        </div>
      )}

      {highlights && highlights.length > 0 && (
        <ul className="space-y-2">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-text-tertiary mt-1 shrink-0" />
              <span className="text-sm text-text-secondary">{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
