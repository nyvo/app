import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
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
          <TeacherSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      )}
    </ProtectedRoute>
  );
}
