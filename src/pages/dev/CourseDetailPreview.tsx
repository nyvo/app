import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { CourseKpis } from '@/components/teacher/CourseOverviewTab';

/**
 * Dev preview for the course-detail free-vs-Pro surfaces: the KPI spine
 * (Pro 3-tile vs free 2-tile, Inntekt dropped on free) and the participant
 * payment badge tone for a free 'external' signup — current warning vs the
 * proposed neutral. Same pattern as DashboardPreview / BillingPreview.
 */
export default function CourseDetailPreview() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10 sm:px-6">
        <Section label="Kurs-KPI — Pro (3 felt)">
          <CourseKpis enrolled={8} capacity={10} revenue={4200} price={350} isPro />
        </Section>

        <Section label="Kurs-KPI — Start / gratis (2 felt, Inntekt droppet)">
          <CourseKpis enrolled={8} capacity={10} revenue={0} price={350} isPro={false} />
        </Section>

        <Section label="Deltaker-badge på free — «Betales direkte» (neutral)">
          <PaymentBadge status="external" visibility="always" />
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <Badge variant="neutral" size="sm">
        {label}
      </Badge>
      {children}
    </section>
  );
}
