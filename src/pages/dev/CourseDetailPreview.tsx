import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { CourseKpis } from '@/components/teacher/CourseOverviewTab';

/**
 * Dev preview for the course-detail KPI surfaces: the KPI spine for a paid
 * course (3-tile, with Inntekt) vs a 0 kr course (2-tile, Inntekt dropped),
 * plus the historical 'external' payment badge tone. Same pattern as
 * DashboardPreview / BillingPreview.
 */
export default function CourseDetailPreview() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10 sm:px-6">
        <Section label="Kurs-KPI — betalt kurs (3 felt)">
          <CourseKpis enrolled={8} capacity={10} revenue={4200} price={350} hasPaidTier />
        </Section>

        <Section label="Kurs-KPI — gratiskurs (2 felt, Inntekt droppet)">
          <CourseKpis enrolled={8} capacity={10} revenue={0} price={0} hasPaidTier={false} />
        </Section>

        <Section label="Deltaker-badge — historisk «Betales direkte» (neutral)">
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
