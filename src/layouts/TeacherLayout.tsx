import { useCallback } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CourseDrawer } from '@/components/teacher/CourseDrawer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

/**
 * `?kurs=:id` is a layout-wide overlay — opens the quick-glance drawer on
 * top of whatever page is mounted (Timeplan, Mine kurs, etc.) without
 * changing the underlying route. Removing the param closes it.
 */
function GlobalCourseDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseId = searchParams.get('kurs') || undefined;

  const close = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('kurs');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return <CourseDrawer courseId={courseId} onClose={close} />;
}

export default function TeacherLayout() {
  const { profile } = useAuth();

  // Unfinished onboarding → bounce to /onboarding. The onboarding route
  // itself handles the role-branching internally.
  if (profile && !profile.onboarding_completed_at) {
    return <Navigate to="/onboarding" replace />;
  }

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
