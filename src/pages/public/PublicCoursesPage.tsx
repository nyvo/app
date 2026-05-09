import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BookOpen, ArrowUpDown } from '@/lib/icons';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug, type PublicSeller } from '@/services/sellers';
import { PublicNav } from '@/components/public/marketing/PublicNav';
import { PublicFooter } from '@/components/public/marketing/PublicFooter';
import { StudioHero } from '@/components/public/studio/StudioHero';
import { FeaturedCourse } from '@/components/public/studio/FeaturedCourse';
import { CourseCard } from '@/components/public/studio/CourseCard';
import type { CourseType } from '@/types/database';

const CANCELLED_GRACE_DAYS = 30;
const PAGE_SIZE = 12;

type TypeFilter = 'all' | CourseType;

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Alle',
  'course-series': 'Kursrekker',
  event: 'Arrangementer',
  online: 'Nettkurs',
};

type SortKey = 'soonest' | 'price-asc' | 'price-desc' | 'title';

const SORT_LABELS: Record<SortKey, string> = {
  soonest: 'Snarest',
  'price-asc': 'Lavest pris',
  'price-desc': 'Høyest pris',
  title: 'Tittel A–Å',
};

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

function getDisplayDateMs(course: PublicCourseWithDetails): number {
  const d = course.next_session?.session_date ?? course.start_date;
  if (!d) return Number.POSITIVE_INFINITY;
  const t = new Date(d).getTime();
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [organization, setOrganization] = useState<PublicSeller | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('soonest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when the filter or sort changes — user always lands on
  // the first page after re-narrowing.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [typeFilter, sortKey]);

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setError('Ugyldig lenke');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const { data: sellerData, error: sellerError } = await fetchSellerBySlug(slug);
      if (sellerError || !sellerData) {
        setError('Fant ikke studioet');
        setLoading(false);
        return;
      }
      setOrganization(sellerData);

      const activeResult = await fetchPublicCourses({ teamSlug: slug });
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

  const visible = useMemo(() => courses.filter(isVisible), [courses]);

  const sorted = useMemo(
    () => visible.slice().sort((a, b) => getDisplayDateMs(a) - getDisplayDateMs(b)),
    [visible],
  );

  const featured = useMemo(
    () => sorted.find(c => c.status !== 'cancelled') ?? null,
    [sorted],
  );

  // Everything except the featured course goes in the grid
  const gridSource = useMemo(
    () => sorted.filter(c => c !== featured),
    [sorted, featured],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = {
      all: gridSource.length,
      'course-series': 0,
      event: 0,
      online: 0,
    };
    for (const c of gridSource) counts[c.course_type]++;
    return counts;
  }, [gridSource]);

  const availableTypes = (Object.keys(TYPE_LABELS) as TypeFilter[]).filter(
    t => t === 'all' || typeCounts[t] > 0,
  );
  const showTypeFilter = availableTypes.length > 1;

  const filtered = useMemo(
    () =>
      typeFilter === 'all'
        ? gridSource
        : gridSource.filter(c => c.course_type === typeFilter),
    [gridSource, typeFilter],
  );

  const filteredSorted = useMemo(() => {
    const arr = filtered.slice();
    switch (sortKey) {
      case 'price-asc':
        return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'price-desc':
        return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case 'title':
        return arr.sort((a, b) => a.title.localeCompare(b.title, 'nb'));
      case 'soonest':
      default:
        return arr.sort((a, b) => getDisplayDateMs(a) - getDisplayDateMs(b));
    }
  }, [filtered, sortKey]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      <PublicNav />

      <main className="flex-1">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center px-6">
            <h3 className="text-2xl font-semibold mb-2 tracking-tight text-foreground">{error}</h3>
            <Button asChild variant="link" className="text-foreground-muted">
              <Link to="/">Gå til forsiden</Link>
            </Button>
          </div>
        )}

        {organization && !loading && !error && (
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <StudioHero organization={organization} />

            {visible.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={BookOpen}
                  title="Ingen planlagte kurs"
                  description="Det er ingen planlagte kurs akkurat nå. Kom tilbake snart."
                  variant="public"
                />
              </div>
            ) : (
              <div className="space-y-12 pb-20">
                {featured && <FeaturedCourse course={featured} />}

                {gridSource.length > 0 && (
                  <section className="space-y-6">
                    <header className="space-y-4">
                      <div className="space-y-1.5">
                        <h2 className="text-xl font-semibold text-foreground">
                          Timer og kurs
                        </h2>
                        <p className="text-sm text-foreground-muted max-w-md">
                          Alle kurs, sortert etter hva som starter snarest.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {showTypeFilter ? (
                          <div role="group" aria-label="Filtrer kurstyper" className="flex flex-wrap gap-2">
                            {availableTypes.map(t => {
                              const active = typeFilter === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setTypeFilter(t)}
                                  aria-pressed={active}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium',
                                    'border transition-all duration-200 outline-none',
                                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                    active
                                      ? 'bg-foreground text-background border-foreground'
                                      : 'bg-background text-foreground border-border hover:border-foreground/40 hover:bg-muted/50',
                                  )}
                                >
                                  {TYPE_LABELS[t]}
                                  {t !== 'all' && (
                                    <span
                                      className={cn(
                                        'tabular-nums text-xs',
                                        active ? 'text-background/60' : 'text-foreground-muted',
                                      )}
                                    >
                                      {typeCounts[t]}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : <span />}

                        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                          <SelectTrigger size="sm" aria-label="Sorter kurs" className="min-w-[200px] gap-1.5">
                            <ArrowUpDown className="size-3.5 text-foreground-muted" strokeWidth={1.75} />
                            <span className="text-foreground-muted">Sorter etter:</span>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                              <SelectItem key={k} value={k}>
                                {SORT_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </header>

                    {filteredSorted.length === 0 ? (
                      <p className="py-12 text-center text-sm text-foreground-muted">
                        Ingen kurs i denne kategorien.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                          {filteredSorted.slice(0, visibleCount).map(course => (
                            <CourseCard key={course.id} course={course} ratio="portrait" />
                          ))}
                        </div>

                        {filteredSorted.length > visibleCount && (
                          <div className="flex flex-col items-center gap-2 pt-8">
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                            >
                              Vis flere
                            </Button>
                            <span className="text-xs text-foreground-muted tabular-nums">
                              Viser {visibleCount} av {filteredSorted.length} kurs
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <PublicFooter studioName={organization?.name} studioCity={organization?.city ?? null} />
    </div>
  );
};

export default PublicCoursesPage;
