import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

export interface CourseDescriptionProps {
  description?: string | null;
  highlights?: string[];
}

const COLLAPSED_HEIGHT = 60; // ~3 lines of text-sm

/**
 * Course description (expandable if long) + practical info highlights
 */
export const CourseDescription: React.FC<CourseDescriptionProps> = ({
  description,
  highlights,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setNeedsTruncation(textRef.current.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [description]);

  if (!description && (!highlights || highlights.length === 0)) {
    return null;
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={textRef}
          className="overflow-hidden transition-[max-height] duration-200 ease-out space-y-4"
          style={{ maxHeight: expanded || !needsTruncation ? '2000px' : `${COLLAPSED_HEIGHT}px` }}
        >
          {description && (
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {description}
            </div>
          )}

          {highlights && highlights.length > 0 && (
            <ul className="space-y-2">
              {highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
                  <span className="text-sm text-text-secondary">{highlight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {needsTruncation && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-text-primary hover:text-text-secondary transition-colors mt-1.5"
        >
          {expanded ? 'Vis mindre' : 'Les mer'}
        </button>
      )}
    </div>
  );
};
