import { useCallback } from 'react';
import { Outlet, useMatches, useSearchParams } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CourseDrawer } from '@/components/teacher/CourseDrawer';
import { ProtectedRoute } from '@/components/ProtectedRoute';

/**
 * Route `handle` opt-out for full-bleed pages (currently just the course
 * builder's h-dvh chrome) — they manage their own scroll container and
 * mobile header instead of the shared one below, so `useMatches` here skips
 * both.
 */
interface TeacherRouteHandle {
  fullBleed?: boolean;
}

/**
 * `?kurs=:id` is a layout-wide overlay — opens the quick-glance drawer on
 * top of whatever page is mounted (Timeplan, Mine kurs, etc.) without
 * changing the underlying route. Removing the param closes it.
 */
function GlobalCourseDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseId = searchParams.get('kurs') || undefined;
  const sessionId = searchParams.get('sess') || undefined;
  const origin = searchParams.get('from') === 'schedule' ? 'schedule' : undefined;

  const close = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('kurs');
        next.delete('sess');
        next.delete('from');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return (
    <CourseDrawer
      courseId={courseId}
      sessionId={sessionId}
      origin={origin}
      onClose={close}
    />
  );
}

export default function TeacherLayout() {
  const matches = useMatches();
  const fullBleed = matches.some((match) => (match.handle as TeacherRouteHandle | undefined)?.fullBleed);

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <TeacherSidebar />
        <SidebarInset>
          {fullBleed ? (
            <Outlet />
          ) : (
            <>
              <MobileTeacherHeader />
              <div className="flex-1 min-h-full overflow-y-auto bg-canvas">
                <Outlet />
              </div>
            </>
          )}
        </SidebarInset>
        <GlobalCourseDrawer />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
