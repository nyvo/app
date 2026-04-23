import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Leaf } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen } from '@/lib/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScheduleDayList } from '@/components/public/schedule/ScheduleDayList';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchOrganizationBySlug, type PublicOrganization } from '@/services/organizations';
import type { CourseType } from '@/types/database';

type TypeFilter = 'all' | CourseType;

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Alle',
  'course-series': 'Kursrekker',
  event: 'Arrangementer',
  online: 'Nett',
};

const CANCELLED_GRACE_DAYS = 30;

function isVisible(course: PublicCourseWithDetails): boolean {
  if (course.status === 'cancelled') {
    if (!course.start_date) return false;
    const graceMs = CANCELLED_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const start = new Date(course.start_date).getTime();
    if (isNaN(start)) return false;
    return Date.now() - start <= graceMs;
  }
  return course.status === 'active' || course.status === 'upcoming';
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [organization, setOrganization] = useState<PublicOrganization | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setError('Ugyldig lenke');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const { data: orgData, error: orgError } = await fetchOrganizationBySlug(slug);
      if (orgError || !orgData) {
        setError('Fant ikke studioet');
        setLoading(false);
        return;
      }
      setOrganization(orgData);

      const activeResult = await fetchPublicCourses({ organizationSlug: slug });
      if (activeResult.error) {
        setError('Kunne ikke laste kurs');
        setLoading(false);
        return;
      }
      setCourses(activeResult.data || []);
      setLoading(false);
    }
    loadData();
  }, [slug]);

  const visibleCourses = useMemo(
    () => courses.filter(isVisible),
    [courses],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = {
      all: visibleCourses.length,
      'course-series': 0,
      event: 0,
      online: 0,
    };
    for (const c of visibleCourses) counts[c.course_type]++;
    return counts;
  }, [visibleCourses]);

  const filtered = useMemo(
    () => typeFilter === 'all' ? visibleCourses : visibleCourses.filter(c => c.course_type === typeFilter),
    [visibleCourses, typeFilter],
  );

  const availableTypes = (Object.keys(TYPE_LABELS) as TypeFilter[])
    .filter(t => t === 'all' || typeCounts[t] > 0);

  const showTypeFilter = availableTypes.length > 2; // >1 real type + 'all'

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      {/* Minimal navbar */}
      <nav className="sticky top-0 z-50 w-full bg-surface-elevated backdrop-blur-md border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-background border border-border group-hover:border-ring transition-colors">
              <Leaf className="size-4 text-foreground" />
            </div>
            <span className="text-base font-medium text-foreground">Ease</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8 sm:py-12">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-xl font-semibold mb-2 text-foreground">{error}</h3>
            <Button asChild variant="link" className="text-muted-foreground">
              <Link to="/">Gå til forsiden</Link>
            </Button>
          </div>
        )}

        {organization && !loading && !error && (
          <>
            {/* Tight studio header — no hero */}
            <header className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {organization.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {organization.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {organization.city}
                  </span>
                )}
                {organization.description && (
                  <span className="max-w-prose">{organization.description}</span>
                )}
              </div>
            </header>

            {/* Type filter */}
            {showTypeFilter && (
              <div className="mb-4">
                <ToggleGroup
                  type="single"
                  value={typeFilter}
                  onValueChange={(v) => { if (v) setTypeFilter(v as TypeFilter); }}
                  variant="segmented"
                  aria-label="Filtrer kurstyper"
                >
                  {availableTypes.map(t => (
                    <ToggleGroupItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}

            {/* Schedule */}
            {filtered.length > 0 ? (
              <ScheduleDayList courses={filtered} studioSlug={slug || ''} />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Ingen planlagte kurs"
                description={
                  typeFilter === 'all'
                    ? 'Det er ingen planlagte kurs akkurat nå.'
                    : 'Ingen kurs i denne kategorien.'
                }
                variant="public"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
