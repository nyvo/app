import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/public/studio/CourseCard';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';

interface OtherCoursesShelfProps {
  /** Slug of the org whose other courses to show */
  organizationSlug: string;
  /** Org display name — drives the section heading */
  organizationName: string;
  /** Course currently on screen — excluded from the shelf */
  excludeCourseId: string;
  /** How many to show. Default 3. */
  limit?: number;
}

/**
 * Mini-shelf at the bottom of a course detail page — replaces the old
 * "Mer fra {studio}" arrow link with real cross-sell. Renders up to N
 * other active/upcoming courses from the same studio, excluding the one
 * the user is on. Returns null when there are none, so the section
 * disappears cleanly on first-time studios.
 */
export function OtherCoursesShelf({
  organizationSlug,
  organizationName,
  excludeCourseId,
  limit = 3,
}: OtherCoursesShelfProps) {
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await fetchPublicCourses({ teamSlug: organizationSlug });
      if (!active) return;
      const visible = (data ?? []).filter(c => {
        if (c.id === excludeCourseId) return false;
        return c.status === 'active' || c.status === 'upcoming';
      });
      setCourses(visible.slice(0, limit));
      setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, [organizationSlug, excludeCourseId, limit]);

  if (!loaded || courses.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">
        Andre kurs fra {organizationName}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            ratio="landscape"
            viewingSlug={organizationSlug}
            viewingName={organizationName}
          />
        ))}
      </div>
    </section>
  );
}
