import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface InstructorPanelProps {
  instructors: PublicCourseWithDetails['instructors'];
}

/**
 * Editorial instructor section. Larger avatar, generous bio with serif accent.
 * Falls back to a calm row layout for multiple instructors.
 */
export function InstructorPanel({ instructors }: InstructorPanelProps) {
  if (instructors.length === 0) return null;
  const heading = instructors.length === 1 ? 'Om instruktøren' : 'Om instruktørene';

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
        {heading}
      </h2>

      <div className="space-y-10">
        {instructors.map(i => (
          <div key={i.id} className="flex flex-col sm:flex-row gap-5 sm:gap-7">
            <div className="shrink-0">
              <UserAvatar
                name={i.name}
                src={i.avatar_url}
                size="xl"
                className="size-20 sm:size-24 ring-1 ring-border"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {i.name || 'Instruktør'}
                </h3>
                {i.role === 'guest' && (
                  <Badge variant="neutral" shape="rect" size="sm">Gjesteinstruktør</Badge>
                )}
              </div>
              {i.bio && (
                <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-wrap max-w-2xl">
                  {i.bio}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
