import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface InstructorPanelProps {
  instructors: PublicCourseWithDetails['instructors'];
  /** Shown when no instructor is set on the course — keeps the slot
      filled with the studio's name + initials, same fallback as CourseCard. */
  studioFallback?: { name: string } | null;
}

/**
 * Instructor card — no heading; the avatar + name self-identify the card.
 * Wrapped in the shared outlined info-card surface so the trio of supporting
 * cards (instructor, sted, praktisk) reads as one cluster.
 *
 * When no instructor is assigned to the course we fall back to the studio
 * name + initials so the card never disappears (consistent with the
 * "fallback to studio" rule applied on CourseCard).
 */
export function InstructorPanel({ instructors, studioFallback }: InstructorPanelProps) {
  const hasInstructors = instructors.length > 0;

  if (!hasInstructors && !studioFallback) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      {hasInstructors ? (
        <div className="space-y-7">
          {instructors.map(i => (
            <div key={i.id} className="flex gap-4 sm:gap-5">
              <UserAvatar
                name={i.name}
                src={i.avatar_url}
                size="lg"
                className="size-14 sm:size-16 shrink-0 ring-1 ring-border"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {i.name || 'Instruktør'}
                  </h3>
                  {i.role === 'guest' && (
                    <Badge variant="neutral" shape="rect" size="sm">Gjesteinstruktør</Badge>
                  )}
                </div>
                {i.bio && (
                  <p className="text-sm leading-relaxed text-foreground-muted whitespace-pre-wrap">
                    {i.bio}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 sm:gap-5 items-center">
          <UserAvatar
            name={studioFallback!.name}
            size="lg"
            className="size-14 sm:size-16 shrink-0 ring-1 ring-border"
          />
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {studioFallback!.name}
          </h3>
        </div>
      )}
    </div>
  );
}
