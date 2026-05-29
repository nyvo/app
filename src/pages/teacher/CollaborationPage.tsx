import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { useAuth } from '@/contexts/AuthContext';

// Helper copy varies by account type. Always present, regardless of
// affiliated state — explains what this page is for before any data shows.
const BUSINESS_DESCRIPTION =
  'Del lenken med en instruktør. Når de godtar, vises kursene deres sammen med dine på studiosiden.';
const INDIVIDUAL_DESCRIPTION =
  'Når et studio inviterer deg, vises kursene dine sammen med deres på studiosiden.';

export default function CollaborationPage() {
  const { currentSeller } = useAuth();
  const isBusiness = currentSeller?.seller_type === 'business';
  const description = isBusiness ? BUSINESS_DESCRIPTION : INDIVIDUAL_DESCRIPTION;

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Samarbeid" />

      <PageShell narrow="centered" title="Samarbeid" description={description}>
        <AffiliationsSection />
      </PageShell>
    </main>
  );
}
