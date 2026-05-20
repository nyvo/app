import { useCallback } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CourseDrawer } from '@/components/teacher/CourseDrawer';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <TeacherSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
        <GlobalCourseDrawer />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
