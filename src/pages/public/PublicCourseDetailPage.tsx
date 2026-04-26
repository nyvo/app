import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, MapPin } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import type { CourseLevel } from '@/types/database';

const LEVEL_LABELS: Record<CourseLevel, string> = {
  alle: 'Alle nivåer',
  nybegynner: 'Nybegynner',
  viderekommen: 'Viderekommen',
};
import { PublicNav } from '@/components/public/marketing/PublicNav';
import { PublicFooter } from '@/components/public/marketing/PublicFooter';
import { CourseHero } from '@/components/public/course-details/CourseHero';
import { InstructorPanel } from '@/components/public/course-details/InstructorPanel';
import { PracticalInfoSection } from '@/components/public/course-details/PracticalInfoSection';
import { BookingPanel } from '@/components/public/course-details/BookingPanel';
import { MobilePriceBar } from '@/components/public/course-details/MobilePriceBar';
import {
  fetchPublicCourseById,
  type PublicCourseWithDetails,
} from '@/services/publicCourses';

export default function PublicCourseDetailPage() {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // We render as a fixed overlay only when navigated *from* a studio card
  // (which passes state.backgroundLocation). Direct visits / shared URLs
  // render as a normal page so screenshot tools, browser zoom, and the
  // document scroll all behave the way users expect.
  const asOverlay = !!(location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);
      const courseRes = await fetchPublicCourseById(courseId);
      if (!active) return;
      if (courseRes.error || !courseRes.data) {
        setError('Kurset finnes ikke eller er ikke tilgjengelig.');
        setLoading(false);
        return;
      }
      setCourse(courseRes.data);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [courseId]);

  // Lock the body scroll only when overlaying so the studio page underneath
  // doesn't chain-scroll once the overlay reaches its top/bottom limit.
  useEffect(() => {
    if (!asOverlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [asOverlay]);

  const backUrl = slug ? `/studio/${slug}` : '/';

  const cancellationCopy = useMemo(
    () => 'Trenger du å avbestille, ta kontakt med studioet. Refusjon avgjøres av studioet fra sak til sak.',
    [],
  );

  const handleBack = () => navigate(backUrl);

  return (
    <div
      className={cn(
        'bg-background text-foreground',
        asOverlay
          ? 'fixed inset-0 z-40 overflow-y-auto overscroll-contain'
          : 'min-h-screen',
      )}
    >
      <div className="flex min-h-full flex-col">
      <PublicNav studioName={course?.organization?.name} studioSlug={course?.organization?.slug} overlay />

      {/* Floating back button — viewport-fixed so it stays put while the overlay scrolls */}
      <div className="fixed top-3 left-3 sm:top-4 sm:left-5 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="bg-background/70 backdrop-blur-md border border-border/40 hover:bg-background"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Tilbake</span>
        </Button>
      </div>

      <main className="flex-1">
        {loading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-base font-medium text-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleBack}>
              Tilbake
            </Button>
          </div>
        )}

        {!loading && !error && course && (
          <>
            <CourseHero course={course} />

            <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-16">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
                {/* Editorial body */}
                <div className="space-y-14 min-w-0">
                  {course.description && (
                    <section className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                          Om kurset
                        </h2>
                        {course.level && (
                          <Badge variant="sage" shape="pill" size="sm">
                            {LEVEL_LABELS[course.level]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-base sm:text-lg leading-[1.6] text-foreground whitespace-pre-wrap max-w-2xl">
                        {course.description}
                      </p>
                    </section>
                  )}

                  {/* Mobile / tablet booking — inline */}
                  <div className="lg:hidden">
                    <BookingPanel course={course} studioSlug={slug || ''} />
                  </div>

                  <InstructorPanel instructors={course.instructors} />

                  {course.location && (
                    <section className="space-y-3">
                      <h2 className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                        Sted
                      </h2>
                      <div className="w-fit max-w-full rounded-lg bg-sand px-5 py-4 flex items-center gap-2.5">
                        <MapPin className="size-4 shrink-0 text-sand-foreground" strokeWidth={1.75} />
                        <span className="text-base text-foreground">{course.location}</span>
                      </div>
                    </section>
                  )}

                  <PracticalInfoSection info={course.practical_info} />

                  <section className="space-y-3">
                    <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
                      Avbestilling
                    </h2>
                    <p className="text-base leading-relaxed text-muted-foreground max-w-2xl">
                      {cancellationCopy}
                    </p>
                  </section>

                  {/* Studio cross-promote */}
                  {course.organization && (
                    <section className="pt-6">
                      <Link
                        to={`/studio/${course.organization.slug}`}
                        className="group inline-flex items-center gap-2 text-sm font-medium text-foreground"
                      >
                        <span className="text-muted-foreground tracking-[0.14em] uppercase text-[11px] font-medium">
                          Mer fra
                        </span>
                        <span className="border-b border-foreground/30 pb-0.5 group-hover:border-foreground transition-colors">
                          {course.organization.name}
                        </span>
                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
                      </Link>
                    </section>
                  )}
                </div>

                {/* Desktop sticky right rail */}
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <BookingPanel course={course} studioSlug={slug || ''} />
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </main>

      <PublicFooter studioName={course?.organization?.name} />

      {/* Pad bottom on mobile so the sticky bar doesn't cover footer content */}
      {!loading && !error && course && (
        <div className="lg:hidden h-20" aria-hidden />
      )}
      </div>

      {!loading && !error && course && <MobilePriceBar course={course} />}
    </div>
  );
}
