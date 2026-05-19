import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageState } from '@/components/page-state/page-state';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug, type PublicSeller } from '@/services/sellers';
import { Mail } from '@/lib/icons';
import { StudioHero, type StudioTab } from '@/components/public/studio/StudioHero';
import { StudioMonthSchedule } from '@/components/public/studio/StudioMonthSchedule';

type ErrorKind = 'not-found' | 'load-failed';

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
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('kurs');

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setErrorKind('not-found');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorKind(null);

      const { data: sellerData, error: sellerError } = await fetchSellerBySlug(slug);
      if (sellerError || !sellerData) {
        setErrorKind('not-found');
        setLoading(false);
        return;
      }
      setOrganization(sellerData);

      const activeResult = await fetchPublicCourses({ teamSlug: slug });
      if (activeResult.error) {
        setErrorKind('load-failed');
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

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      <main className="flex-1">
        {loading && <StudioPageSkeleton />}

        {errorKind === 'not-found' && !loading && (
          <PageState variant="public-team" />
        )}

        {errorKind === 'load-failed' && !loading && (
          <PageState variant="server-error" />
        )}

        {organization && !loading && !errorKind && (
          <div className="animate-in fade-in duration-150">
            <StudioHero
              organization={organization}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {activeTab === 'kurs' ? (
                visible.length === 0 ? (
                  <div className="py-16">
                    <EmptyState
                      title="Ingen planlagte kurs"
                      description="Det er ingen planlagte kurs akkurat nå. Kom tilbake snart."
                    />
                  </div>
                ) : (
                  <div className="pt-10 pb-20">
                    <StudioMonthSchedule
                      courses={sorted}
                      viewingSlug={slug}
                      viewingName={organization.name}
                    />
                  </div>
                )
              ) : (
                <div className="pt-10 pb-20 max-w-2xl">
                  <h2 className="text-xl font-semibold text-foreground">Om studioet</h2>
                  <dl className="mt-6 space-y-6">
                    {organization.email && (
                      <div>
                        <dt className="text-xs font-medium text-foreground-muted">
                          E-post
                        </dt>
                        <dd className="mt-1 flex items-center gap-2 text-sm text-foreground">
                          <Mail className="size-3.5 shrink-0 text-foreground-muted" strokeWidth={1.75} />
                          <a
                            href={`mailto:${organization.email}`}
                            className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
                          >
                            {organization.email}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function StudioPageSkeleton() {
  return (
    <div
      className="animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      {/* Hero block — matches StudioHero cover + identity */}
      <Skeleton className="h-48 w-full rounded-none sm:h-64" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="pt-8 pb-6 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {/* Day strip — matches StudioMonthSchedule scroller */}
        <div className="pt-4 space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-28 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Class card list */}
        <div className="pt-8 pb-20 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PublicCoursesPage;
