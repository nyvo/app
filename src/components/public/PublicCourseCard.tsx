import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { formatKroner } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import {
  getAvailabilityText,
  formatDuration,
} from './courseCardUtils';

interface PublicCourseCardProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
  isSignedUp?: boolean;
}

export const PublicCourseCard = ({
  course,
  studioSlug,
}: PublicCourseCardProps) => {
  const isFull = course.spots_available === 0;

  const metaItems: string[] = [];
  if (course.location) metaItems.push(course.location);
  if (course.duration) metaItems.push(formatDuration(course.duration));

  return (
    <Link to={`/studio/${studioSlug}/${course.id}`} className="block group">
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden smooth-transition hover:border-zinc-300">
        {/* Image area */}
        {course.image_url ? (
          <div className="aspect-[4/3] w-full overflow-hidden">
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-zinc-100 flex items-center justify-center">
            <span className="text-4xl text-text-tertiary">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-8 space-y-4">
          <h3 className="tracking-tight text-xl font-medium text-text-primary leading-snug">
            {course.title}
          </h3>

          {metaItems.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              {metaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-text-tertiary" aria-hidden="true">&middot;</span>}
                  {item}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-medium text-text-primary">
              {formatKroner(course.price)}
            </span>

            {!isFull ? (
              <Button variant="default" size="sm">
                Meld deg på
              </Button>
            ) : (
              <StatusIndicator
                variant="neutral"
                mode="badge"
                size="xs"
                label={getAvailabilityText(0)}
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
