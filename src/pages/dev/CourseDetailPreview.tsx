import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { PaymentBadge } from '@/components/ui/payment-badge';

/**
 * Dev preview for the historical 'external' payment badge tone. Same pattern as
 * DashboardPreview / BillingPreview.
 */
export default function CourseDetailPreview() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10 sm:px-6">
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
