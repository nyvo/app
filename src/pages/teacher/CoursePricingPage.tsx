import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CoursePricingTab } from '@/components/teacher/CoursePricingTab';
import { routes } from '@/lib/routes';

// ---------------------------------------------------------------------------
// Dedicated route for managing a course's ticket types (priser).
// Replaces the "Priser" tab on CourseDetailPage — same content, but its own
// URL means the page weight stays off the detail page and tickets are
// bookmarkable.
// ---------------------------------------------------------------------------

const CoursePricingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useTeacherShell();
  const { course: courseData, loading: isLoading, error } = useCourseDetail(id);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: routes.dashboard },
      { label: 'Kurs', to: routes.courses },
      { label: courseData?.title || 'Kursdetaljer', to: id ? routes.course(id) : undefined },
      { label: 'Priser' },
    ]);
    return () => setBreadcrumbs(null);
  }, [courseData?.title, id, setBreadcrumbs]);

  if (isLoading) {
    return (
      <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Priser" />
        <div className="px-6 lg:px-8 py-8 mx-auto w-full max-w-4xl">
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </main>
    );
  }

  if (error || !courseData) {
    return (
      <main className="flex-1 min-h-full bg-background">
        <MobileTeacherHeader title="Priser" />
        <div className="flex-1 flex items-center justify-center text-center py-24">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-foreground">Kurs ikke funnet</h1>
            <p className="text-sm text-foreground-muted">{error || 'Kurset finnes ikke eller har blitt slettet.'}</p>
            <Button
              variant="outline-soft"
              size="sm"
              className="mt-6"
              onClick={() => navigate(routes.courses)}
            >
              Tilbake til kurs
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Priser" />
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mx-auto w-full max-w-4xl pt-6 lg:pt-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-3 -ml-2 text-foreground-muted hover:text-foreground"
          >
            <Link to={id ? routes.course(id) : routes.courses}>
              <ArrowLeft className="size-3.5" />
              Tilbake til kurs
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold text-foreground">Priser</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Billettyper og priser for {courseData.title}.
          </p>

          <div className="mt-8">
            <CoursePricingTab
              courseId={id!}
              courseTotalWeeks={courseData.totalWeeks ?? null}
            />
          </div>
        </div>
      </motion.div>
    </main>
  );
};

export default CoursePricingPage;
