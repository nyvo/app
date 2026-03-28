import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function TeacherLayout() {
  return (
    <ProtectedRoute requiredUserType="teacher">
      <SidebarProvider>
        <TeacherSidebar />
        <Outlet />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
