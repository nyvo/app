import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import CreateCourseDrawer from '@/pages/teacher/CreateCourseDrawer';
import { DevPage } from './_kit';

/**
 * Dev-only — mounts the REAL CreateCourseDrawer auth-free (no seller, no
 * sidebar rail) so layout/hierarchy changes are previewable and
 * screenshottable without logging in. Submitting won't work here.
 */
export default function CourseBuilderLivePreview() {
  return (
    <DevPage title="Kursbygger (live)" bleed>
      <SidebarProvider>
        <SidebarInset>
          <CreateCourseDrawer onClose={() => {}} />
        </SidebarInset>
      </SidebarProvider>
    </DevPage>
  );
}
