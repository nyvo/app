import { Outlet, useLocation } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherShellProvider } from '@/components/teacher/TeacherShellContext';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { TeacherTopBar } from '@/components/teacher/TeacherTopBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { WelcomeFlow } from '@/components/teacher/WelcomeFlow';
import { useAuth } from '@/contexts/AuthContext';

const FULL_WIDTH_ROUTES = ['/teacher/schedule', '/teacher/messages'];

export default function TeacherLayout() {
  const { profile, refreshOrganizations } = useAuth();
  const { pathname } = useLocation();
  const showWelcome = !!profile && !profile.onboarding_completed_at;
  const isFullWidth = FULL_WIDTH_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <ProtectedRoute>
      {showWelcome ? (
        <WelcomeFlow onComplete={refreshOrganizations} />
      ) : (
        <SidebarProvider>
          <TeacherShellProvider>
            <TeacherSidebar />
            <SidebarInset>
              <TeacherTopBar />
              <div className="min-h-0 flex-1">
                {isFullWidth ? (
                  <Outlet />
                ) : (
                  <div className="mx-auto w-full max-w-[1600px]">
                    <Outlet />
                  </div>
                )}
              </div>
            </SidebarInset>
          </TeacherShellProvider>
        </SidebarProvider>
      )}
    </ProtectedRoute>
  );
}
