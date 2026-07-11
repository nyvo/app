import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CourseBuilderPage from '@/pages/teacher/CourseBuilderPage';

/**
 * Dev-only — mounts the REAL CourseBuilderPage auth-free (no seller, no
 * sidebar rail) so layout/hierarchy changes are previewable and
 * screenshottable without logging in. Submitting won't work here.
 */
export default function CourseBuilderLivePreview() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <CourseBuilderPage />
      </SidebarInset>
    </SidebarProvider>
  );
}
