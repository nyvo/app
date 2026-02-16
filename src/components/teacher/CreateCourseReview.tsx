import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CreateCourseReviewProps {
  courseTypeLabel: string;
  title: string;
  description?: string | null;

  hasCoverImage: boolean;

  startDateLabel: string;
  timeAndDurationLabel: string;
  weeksLabel?: string | null;
  locationLabel: string;

  capacityLabel: string;
  priceLabel: string;
  practicalInfoLabel?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Label + value row in the 160 px | 1fr grid. */
function SummaryRow({
  label,
  children,
  align = 'baseline',
}: {
  label: string;
  children: React.ReactNode;
  align?: 'baseline' | 'start';
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4',
        align === 'start' ? 'items-start' : 'items-baseline',
      )}
    >
      <dt className="text-sm text-text-secondary font-normal">{label}</dt>
      <dd className="text-sm font-medium text-text-primary">{children}</dd>
    </div>
  );
}

/** Section heading inside the ledger. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-text-primary tracking-tight mb-5">
      {children}
    </h2>
  );
}

/** Warning alert for missing cover image. */
function MissingImageWarning() {
  return (
    <Alert variant="warning" size="sm" icon={ImageOff}>
      <AlertTitle variant="warning">Kursbilde mangler</AlertTitle>
      <AlertDescription variant="warning">
        Kurs uten bilde er mindre synlig i søk.
      </AlertDescription>
    </Alert>
  );
}

/** Placeholder for missing optional values. */
function NotSet() {
  return <span className="text-text-secondary font-normal">Ikke angitt</span>;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Single-card "ledger" summary for the review-before-publish step.
 * Three sections separated by subtle dividers inside one card.
 * Accepts pre-formatted display strings — caller handles formatting.
 */
export function CreateCourseReview({
  courseTypeLabel,
  title,
  description,
  hasCoverImage,
  startDateLabel,
  timeAndDurationLabel,
  weeksLabel,
  locationLabel,
  capacityLabel,
  priceLabel,
  practicalInfoLabel,
}: CreateCourseReviewProps) {
  return (
    <div
      className="rounded-xl bg-white border border-zinc-200 overflow-hidden"
      role="region"
      aria-label="Sjekk oppsummering"
    >
      {/* Section 1 — Course identity */}
      <section className="px-6 py-6 sm:px-8 sm:py-7 border-b border-zinc-100">
        <SectionHeading>Kursdetaljer</SectionHeading>
        <dl className="space-y-5">
          <SummaryRow label="Tittel">
            <span className="inline-flex items-center gap-3">
              {title}
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-50 text-text-primary border border-zinc-200">
                {courseTypeLabel}
              </span>
            </span>
          </SummaryRow>

          <SummaryRow label="Kursbilde" align="start">
            {hasCoverImage ? (
              <span className="font-medium text-text-primary">Lastet opp</span>
            ) : (
              <MissingImageWarning />
            )}
          </SummaryRow>

          <SummaryRow label="Beskrivelse" align="start">
            {description?.trim() ? (
              <span className="font-normal line-clamp-3">
                {description.trim()}
              </span>
            ) : (
              <NotSet />
            )}
          </SummaryRow>
        </dl>
      </section>

      {/* Section 2 — Logistics & schedule */}
      <section className="px-6 py-6 sm:px-8 sm:py-7 border-b border-zinc-100">
        <SectionHeading>Tid, sted og kapasitet</SectionHeading>
        <dl className="space-y-5">
          <SummaryRow label="Startdato">{startDateLabel}</SummaryRow>

          <SummaryRow label="Tid og varighet">{timeAndDurationLabel}</SummaryRow>

          {weeksLabel != null && (
            <SummaryRow label="Varighet">{weeksLabel}</SummaryRow>
          )}

          <SummaryRow label="Sted">{locationLabel}</SummaryRow>

          <SummaryRow label="Deltakere">{capacityLabel}</SummaryRow>
        </dl>
      </section>

      {/* Section 3 — Pricing */}
      <section className="px-6 py-6 sm:px-8 sm:py-7">
        <SectionHeading>Pris og praktisk info</SectionHeading>
        <dl className="space-y-5">
          <SummaryRow label="Pris per deltaker">{priceLabel}</SummaryRow>

          <SummaryRow label="Praktisk info">
            {practicalInfoLabel ?? <NotSet />}
          </SummaryRow>
        </dl>
      </section>
    </div>
  );
}
