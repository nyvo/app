import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CourseBuilderPage from '@/pages/teacher/CourseBuilderPage';
import { DevPage } from './_kit';

/**
 * Dev-only — mounts the REAL CourseBuilderPage auth-free (no seller, no
 * sidebar rail) so layout/hierarchy changes are previewable and
 * screenshottable without logging in. Submitting won't work here.
 */
export default function CourseBuilderLivePreview() {
  return (
    <DevPage title="Kursbygger (live)" bleed>
      <SidebarProvider>
        <SidebarInset>
          <CourseBuilderPage />
        </SidebarInset>
      </SidebarProvider>
    </DevPage>
  );
}
