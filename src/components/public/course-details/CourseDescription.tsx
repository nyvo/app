import React, { useState, useRef, useEffect } from 'react';
import { Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';

export interface CourseDescriptionProps {
  description?: string | null;
  highlights?: string[];
}

const COLLAPSED_HEIGHT = 60; // ~3 lines of compact body text

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
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </div>
          )}

          {highlights && highlights.length > 0 && (
            <ul className="space-y-2">
              {highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{highlight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {needsTruncation && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>
      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium tracking-wide text-foreground h-auto p-0 mt-1.5 hover:bg-transparent hover:text-muted-foreground"
        >
          {expanded ? 'Vis mindre' : 'Les mer'}
        </Button>
      )}
    </div>
  );
};
