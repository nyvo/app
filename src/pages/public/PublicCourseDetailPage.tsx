import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PublicNav } from '@/components/public/marketing/PublicNav';
import { PublicFooter } from '@/components/public/marketing/PublicFooter';
import { CourseHero } from '@/components/public/course-details/CourseHero';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import { CourseSessions } from '@/components/public/course-details/CourseSessions';
import { OtherCoursesShelf } from '@/components/public/course-details/OtherCoursesShelf';
import { BookingPanel } from '@/components/public/course-details/BookingPanel';
import { MobilePriceBar } from '@/components/public/course-details/MobilePriceBar';
import { RichTextContent } from '@/components/ui/rich-text-content';
import {
  fetchPublicCourseBySlug,
  type PublicCourseWithDetails,
} from '@/services/publicCourses';
import { supabase } from '@/lib/supabase';
import type { CourseSession } from '@/types/database';

export default function PublicCourseDetailPage() {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const asOverlay = !!(location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug || !courseSlug) return;
      setLoading(true);
      setError(null);
      const courseRes = await fetchPublicCourseBySlug(slug, courseSlug);
      if (!active) return;
      if (courseRes.error || !courseRes.data) {
        setError('Kurset finnes ikke eller er ikke tilgjengelig.');
        setLoading(false);
        return;
      }

      // Canonical URL = owner's team slug. If the visitor landed via a
      // venue's storefront (syndicated affiliation), redirect to the owner's
      // URL so bookmarks and shares always point at the canonical page.
      const ownerSlug = courseRes.data.seller?.slug;
      if (ownerSlug && ownerSlug !== slug) {
        navigate(`/${ownerSlug}/${courseSlug}`, { replace: true, state: location.state });
        return;
      }

      setCourse(courseRes.data);

      // Fetch the dated session list for the dates accordion. Series courses
      // benefit most; single-event courses typically have one row.
      const { data: sessionRows } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseRes.data.id)
        .order('session_date', { ascending: true });
      if (!active) return;
      setSessions((sessionRows ?? []) as CourseSession[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [slug, courseSlug, navigate, location.state]);

  // Lock the body scroll only when overlaying.
  useEffect(() => {
    if (!asOverlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [asOverlay]);

  const backUrl = slug ? `/${slug}` : '/';
  const handleBack = () => navigate(backUrl);

  // Show the dates accordion only when there's something useful in it —
  // series courses or any course with multiple sessions.
  const showDatesAccordion = useMemo(() => {
    if (!course) return false;
    if (course.format === 'series') return sessions.length > 0;
    return sessions.length > 1;
  }, [course, sessions]);

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
        <PublicNav studioName={course?.seller?.name} studioSlug={course?.seller?.slug} overlay />

        {asOverlay && (
          <div className="fixed top-3 left-3 sm:top-4 sm:left-5 z-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="bg-background/70 backdrop-blur-md border border-border/40 hover:bg-background"
            >
              Tilbake
            </Button>
          </div>
        )}

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

              <div className="mx-auto max-w-6xl px-4 sm:px-8 py-12 sm:py-16">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
                  <div className="flex flex-col gap-14 max-w-[640px] min-w-0">
                    {/* Om kurset — leads the body */}
                    {course.description && (
                      <section>
                        <h2 className="text-xl font-semibold text-foreground mb-3.5">
                          Om kurset
                        </h2>
                        <RichTextContent
                          html={course.description}
                          className="text-base leading-relaxed text-foreground"
                        />
                      </section>
                    )}

                    {/* Mobile / tablet booking — inline */}
                    <div className="lg:hidden">
                      <BookingPanel course={course} studioSlug={slug || ''} />
                    </div>

                    {/* Dates — "when" matters more than "where" for the
                        booking decision, so sessions sit above location. */}
                    {showDatesAccordion && (
                      <Accordion type="single" collapsible className="rounded-xl border border-border bg-surface">
                        <AccordionItem value="dates" className="not-last:border-b-0">
                          <AccordionTrigger className="px-4 py-3.5 text-base font-medium items-center hover:no-underline">
                            <div className="flex flex-1 items-center justify-between mr-3">
                              <span className="text-foreground">Alle datoer</span>
                              <span className="text-sm font-medium text-foreground-muted tabular-nums">
                                {sessions.length} {sessions.length === 1 ? 'gang' : 'ganger'}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <CourseSessions sessions={sessions} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {course.location && (
                      <section>
                        <LocationCard location={course.location} />
                      </section>
                    )}

                    {/* Cross-sell shelf — only renders when there are other courses */}
                    {course.seller && (
                      <OtherCoursesShelf
                        organizationSlug={course.seller.slug}
                        organizationName={course.seller.name}
                        excludeCourseId={course.id}
                      />
                    )}
                  </div>

                  {/* Desktop right rail — sticky so booking stays visible
                      while the customer scans description / dates / location.
                      Per patterns.md §18.10 — booking IS the page's purpose. */}
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

        <PublicFooter studioName={course?.seller?.name} />

        {!loading && !error && course && (
          <div className="lg:hidden h-20" aria-hidden />
        )}
      </div>

      {!loading && !error && course && <MobilePriceBar course={course} />}
    </div>
  );
}
