import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoursePreviewCard, CoursePreviewCardSkeleton } from './CoursePreviewCard';
import type { DetailedCourse } from '@/types/dashboard';

interface CourseSectionProps {
  title: string;
  subtitle?: string;
  courses: DetailedCourse[];
  maxVisible?: number;
  showCount?: boolean;
  className?: string;
}

/**
 * A section for grouping courses by category.
 * Always visible (no accordion) with "show more" for overflow.
 */
export function CourseSection({
  title,
  subtitle,
  courses,
  maxVisible = 5,
  showCount = true,
  className,
}: CourseSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleCourses = showAll ? courses : courses.slice(0, maxVisible);
  const hasMore = courses.length > maxVisible;
  const hiddenCount = courses.length - maxVisible;

  if (courses.length === 0) {
    return null; // Don't render empty sections
  }

  return (
    <section className={cn("space-y-3", className)}>
      {/* Section header - static, no accordion */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-text-primary">
            {title}
          </h2>
          {showCount && (
            <span className="px-2.5 py-0.5 rounded-lg bg-white text-xs font-medium text-text-primary">
              {courses.length}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Course list */}
      <div className="space-y-2">
        {visibleCourses.map((course) => (
          <CoursePreviewCard
            key={course.id}
            course={course}
          />
        ))}

        {/* Show more / less button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Vis færre
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Vis {hiddenCount} til
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Loading skeleton for course section
 */
export function CourseSectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-24 bg-surface-elevated rounded animate-pulse" />
        <div className="h-5 w-8 bg-surface-elevated rounded-full animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-2">
        {[...Array(count)].map((_, i) => (
          <CoursePreviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

interface ArchiveLinkProps {
  count: number;
  onClick: () => void;
  className?: string;
}

/**
 * Collapsed archive link for completed courses
 */
export function ArchiveLink({ count, onClick, className }: ArchiveLinkProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white/50 hover:bg-zinc-50/50 smooth-transition group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">
          Arkiv
        </span>
        <span className="px-2.5 py-0.5 rounded-lg bg-white text-xs font-medium text-text-primary">
          {count} fullførte kurs
        </span>
      </div>
      <ChevronDown className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
    </button>
  );
}
