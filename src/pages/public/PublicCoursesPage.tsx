import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug, type PublicSeller } from '@/services/sellers';
import { Mail } from '@/lib/icons';
import { StudioHero, type StudioTab } from '@/components/public/studio/StudioHero';
import { StudioMonthSchedule } from '@/components/public/studio/StudioMonthSchedule';

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('kurs');

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

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      <main className="flex-1">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-12">
            <h1 className="text-2xl font-semibold tracking-tight max-w-md text-foreground">
              {error}
            </h1>
            <p className="mt-3 text-sm text-foreground-muted max-w-md">
              Lenken er kanskje utdatert, eller studioet er flyttet.
            </p>
            <Button size="sm" className="mt-7" onClick={() => window.location.reload()}>
              Prøv igjen
            </Button>
            <Link
              to="/"
              className="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted"
            >
              eller gå til startsiden →
            </Link>
          </main>
        )}

        {organization && !loading && !error && (
          <>
            <StudioHero
              organization={organization}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
                    <StudioMonthSchedule courses={sorted} />
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
          </>
        )}
      </main>
    </div>
  );
};

export default PublicCoursesPage;
