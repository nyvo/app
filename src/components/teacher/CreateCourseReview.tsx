import { useMemo } from 'react';
import { Calendar, Clock, MapPin, Users, Banknote, Info, ImageOff, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CreateCourseReviewProps {
  courseTypeLabel: string;
  title: string;
  description?: string | null;

  imageFile?: File | null;

  startDateLabel: string;
  timeAndDurationLabel: string;
  weeksLabel?: string | null;
  locationLabel: string;

  capacityLabel: string;
  priceLabel: string;
  practicalInfoLabel?: string | null;

  /** Called with step index to navigate back for editing */
  onEditStep?: (step: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Icon + label on left, value on right — same weight both sides. */
function Row({
  icon: Icon,
  label,
  children,
  muted = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="type-body text-foreground">{label}</span>
      </div>
      <div className={`type-body text-right ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {children}
      </div>
    </div>
  );
}

/** Section divider — stronger visual break with edit action. */
function SectionDivider({
  label,
  onEdit,
  first = false,
}: {
  label: string;
  onEdit?: () => void;
  first?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between -mx-6 bg-surface-muted px-6 py-2 ${first ? 'border-b border-border' : 'border-y border-border'}`}>
      <span className="type-meta text-muted-foreground">{label}</span>
      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onEdit}
          aria-label={`Endre ${label.toLowerCase()}`}
          className="type-meta text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground"
        >
          Endre
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CreateCourseReview({
  courseTypeLabel,
  title,
  description,
  imageFile,
  startDateLabel,
  timeAndDurationLabel,
  weeksLabel,
  locationLabel,
  capacityLabel,
  priceLabel,
  practicalInfoLabel,
  onEditStep,
}: CreateCourseReviewProps) {
  const imagePreviewUrl = useMemo(
    () => imageFile ? URL.createObjectURL(imageFile) : null,
    [imageFile],
  );

  return (
    <div className="rounded-lg bg-background border border-border overflow-hidden">
      {/* Image banner */}
      {imagePreviewUrl && (
        <div className="h-40 overflow-hidden">
          <img src={imagePreviewUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-6">
        {/* Section 1 — Course details */}
        <SectionDivider first label="Detaljer" onEdit={onEditStep ? () => onEditStep(0) : undefined} />

        <div className="divide-y divide-border">
          <Row icon={Info} label="Tittel">{title}</Row>
          <Row icon={Info} label="Type">{courseTypeLabel}</Row>
          {description?.trim() && (
            <Row icon={Info} label="Beskrivelse">
              <span className="line-clamp-2 max-w-[240px]">{description.trim()}</span>
            </Row>
          )}
          <Row icon={Image} label="Kursbilde" muted={!imagePreviewUrl}>
            {imagePreviewUrl ? 'Lastet opp' : (
              <span className="flex items-center gap-1.5">
                <ImageOff className="h-3.5 w-3.5" />
                Mangler
              </span>
            )}
          </Row>
        </div>

        {/* Section 2 — Schedule & logistics */}
        <SectionDivider label="Tid og sted" onEdit={onEditStep ? () => onEditStep(1) : undefined} />

        <div className="divide-y divide-border">
          <Row icon={Calendar} label="Startdato">{startDateLabel}</Row>
          <Row icon={Clock} label="Tid og varighet">{timeAndDurationLabel}</Row>
          {weeksLabel != null && (
            <Row icon={Calendar} label="Kursperiode">{weeksLabel}</Row>
          )}
          <Row icon={MapPin} label="Sted">{locationLabel}</Row>
          <Row icon={Users} label="Deltakere">{capacityLabel}</Row>
        </div>

        {/* Section 3 — Pricing */}
        <SectionDivider label="Pris" onEdit={onEditStep ? () => onEditStep(2) : undefined} />

        <div className="divide-y divide-border">
          <Row icon={Banknote} label="Pris per deltaker">{priceLabel}</Row>
          {practicalInfoLabel && (
            <Row icon={Info} label="Praktisk info">{practicalInfoLabel}</Row>
          )}
        </div>
      </div>
    </div>
  );
}
