import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherShellProvider } from '@/components/teacher/TeacherShellContext';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { TeacherTopBar } from '@/components/teacher/TeacherTopBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { WelcomeFlow } from '@/components/teacher/WelcomeFlow';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherLayout() {
  const { profile, refreshOrganizations } = useAuth();
  const showWelcome = !!profile && !profile.onboarding_completed_at;

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
                <Outlet />
              </div>
            </SidebarInset>
          </TeacherShellProvider>
        </SidebarProvider>
      )}
    </ProtectedRoute>
  );
}
