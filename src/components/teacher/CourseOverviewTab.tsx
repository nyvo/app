import { useRef, useState } from 'react';
import { Clock } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MappedCourse } from '@/hooks/use-course-detail';
import {
  PublishChecklist,
  type ChecklistItemKey,
} from '@/components/teacher/PublishChecklist';

interface CourseOverviewTabProps {
  course: MappedCourse;
  /** Raw Dintero onboarding status (PENDING | WAITING_FOR_DECLARATION |
   *  WAITING_FOR_SIGNATURE | ACTIVE | DECLINED | TERMINATED | null) */
  dinteroOnboardingStatus: string | null;
  dinteroOnboardingComplete: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
  /** Opens the Kursplan modal — used by Kommende/Pågår and Ferdig. */
  onOpenKursplan: () => void;
  /** Routes to /innstillinger/utbetaling. Used by the Dintero checklist row. */
  onSetupDinteroClick: () => void;
  /** Caller decides what each checklist row navigates to (image/description/
   *  location → Rediger tab; dintero → onSetupDinteroClick). */
  onJumpToField: (key: ChecklistItemKey) => void;
}

const WAITING_STATUSES = new Set([
  'PENDING',
  'WAITING_FOR_DECLARATION',
  'WAITING_FOR_SIGNATURE',
]);

function formatNorwegianDate(input: string | null | undefined): string {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function CourseOverviewTab({
  course,
  dinteroOnboardingStatus,
  dinteroOnboardingComplete,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
  onOpenKursplan,
  onSetupDinteroClick,
  onJumpToField,
}: CourseOverviewTabProps) {
  const isSeries = course.format === 'series';
  const isFree = course.price <= 0;
  // Persisted status is the source of truth — reconcile_course_lifecycle keeps
  // it honest (upcoming/active/completed), so the lifecycle branches below
  // (incl. the `completed` end-state) work directly off it.
  const status = course.status;

  const isWaitingForDintero =
    status === 'draft' &&
    !dinteroOnboardingComplete &&
    dinteroOnboardingStatus !== null &&
    WAITING_STATUSES.has(dinteroOnboardingStatus);

  // Drop-in and late-signups are both series-only concepts (the RPC ignores
  // them for single courses), so the whole section is hidden on enkelttime.
  const showTogglesCard =
    isSeries && (status === 'draft' || status === 'upcoming' || status === 'active');
  const showKursplanCard = isSeries && (status === 'upcoming' || status === 'active');
  const showSingleSessionCard = !isSeries && (status === 'upcoming' || status === 'active');

  const kursplanSub =
    status === 'upcoming'
      ? `${course.totalWeeks} timer · starter ${formatNorwegianDate(course.startDate)}`
      : `${course.totalWeeks} timer · pågår`;

  // Single (enkelttime) courses have no kursplan and no series-only toggles, so
  // surface the one session's date/time + fill rate to keep the Oversikt tab
  // useful instead of empty.
  const singleSessionTime = course.timeSchedule.includes(',')
    ? course.timeSchedule.split(',').pop()!.trim()
    : course.timeSchedule;
  const singleSessionSub = [
    course.startDate ? formatNorwegianDate(course.startDate) : null,
    singleSessionTime || null,
    course.capacity > 0 ? `${course.enrolled} av ${course.capacity} påmeldt` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      {isWaitingForDintero && (
        <div className="mb-6">
          <InfoBanner
            title="Venter på godkjenning fra Dintero."
            sub="Vi varsler deg på e-post når den er godkjent. Det tar vanligvis 1–2 virkedager."
            action={{ label: 'Se status', onClick: onSetupDinteroClick }}
          />
        </div>
      )}

      {status === 'draft' && (
        <div className="mb-6">
          <PublishChecklist
            items={[
              {
                key: 'image',
                title: 'Legg til et bilde',
                description: 'Anbefalt, men ikke påkrevd for publisering.',
                done: !!course.imageUrl,
                required: false,
              },
              {
                key: 'description',
                title: 'Skriv en kort beskrivelse',
                description: 'Hva får deltakerne ut av kurset?',
                done: !!course.description,
              },
              {
                key: 'location',
                title: 'Velg sted',
                description: 'Adressen vises på kurssiden og i bekreftelsen.',
                done: !!course.location,
              },
              {
                key: 'dintero',
                title: 'Sett opp utbetaling',
                description: 'Påkrevd for å ta imot påmeldinger.',
                done: dinteroOnboardingComplete,
              },
            ]}
            onItemClick={onJumpToField}
          />
        </div>
      )}

      <div className="divide-y divide-border">
        {showKursplanCard && (
          <KursplanSection sub={kursplanSub} onOpen={onOpenKursplan} />
        )}

        {showSingleSessionCard && <SingleSessionSection sub={singleSessionSub} />}

        {status === 'completed' && (
          <EndStateSection
            title={
              course.endDate
                ? `Siste time var ${formatNorwegianDate(course.endDate)}`
                : 'Kurset er ferdig'
            }
            sub={`${course.enrolled} deltakere fullførte kursrekken.`}
            action={isSeries ? { label: 'Se kursplan', onClick: onOpenKursplan } : undefined}
          />
        )}

        {status === 'cancelled' && (
          <EndStateSection
            title="Kurset er avlyst"
            sub="Påmeldte er varslet og refundert."
          />
        )}

        {showTogglesCard && (
          <TogglesSection
            isFree={isFree}
            allowsDropIn={allowsDropIn}
            onAllowsDropInChange={onAllowsDropInChange}
            dropInPrice={dropInPrice}
            onDropInPriceChange={onDropInPriceChange}
            acceptsLateSignups={acceptsLateSignups}
            onAcceptsLateSignupsChange={onAcceptsLateSignupsChange}
          />
        )}
      </div>
    </div>
  );
}

// ─── Banner ────────────────────────────────────────────────────────────

interface BannerProps {
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}

function InfoBanner({ title, sub, action }: BannerProps) {
  return (
    <BaseBanner
      title={title}
      sub={sub}
      action={action}
      tone="info"
      icon={<Clock className="size-5" />}
    />
  );
}

function BaseBanner({
  title,
  sub,
  action,
  tone,
  icon,
}: BannerProps & { tone: 'warning' | 'info'; icon: React.ReactNode }) {
  const toneClasses =
    tone === 'warning'
      ? 'bg-warning-subtle border-warning/20 text-warning'
      : 'bg-info-subtle border-info/20 text-info';
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-md border px-4 py-3.5',
        toneClasses,
      )}
    >
      <div className={cn('shrink-0', tone === 'warning' ? 'text-warning' : 'text-info')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-foreground">
        <p className="text-base font-medium">{title}</p>
        <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
      </div>
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Section row (title + sub + action, sits directly on canvas) ──────

function KursplanSection({ sub, onOpen }: { sub: string; onOpen: () => void }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">Kursplan</p>
          <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
        </div>
        <Button variant="secondary" onClick={onOpen}>
          Se kursplan
        </Button>
      </div>
    </section>
  );
}

function SingleSessionSection({ sub }: { sub: string }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">Timen</p>
        <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
      </div>
    </section>
  );
}

function EndStateSection({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
        </div>
        {action && (
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </section>
  );
}

// ─── Toggles section (drop-in + late signups, lives on canvas) ────────

interface TogglesSectionProps {
  isFree: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
}

function TogglesSection({
  isFree,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
}: TogglesSectionProps) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="divide-y divide-border-subtle">
        <DropInToggleRow
          checked={allowsDropIn}
          onChange={onAllowsDropInChange}
          price={dropInPrice}
          onPriceChange={onDropInPriceChange}
        />
        <ToggleRow
          label="Tillat påmelding etter oppstart"
          help={
            isFree
              ? 'Lar deltakere melde seg på etter at kurset har startet.'
              : 'Prisen blir justert automatisk etter antall uker igjen.'
          }
          checked={acceptsLateSignups}
          onChange={onAcceptsLateSignupsChange}
        />
      </div>
    </section>
  );
}

// ─── Toggle row (label + switch, optional help, optional price input) ─

interface ToggleRowProps {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children?: React.ReactNode;
}

function ToggleRow({ label, help, checked, onChange, children }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        {help && (
          <p className="text-base text-foreground-muted mt-1">{help}</p>
        )}
        {children}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}

// ─── Drop-in toggle row (owns price + activation validation) ──────────

interface DropInToggleRowProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  price: number;
  onPriceChange: (next: number) => void;
}

function DropInToggleRow({ checked, onChange, price, onPriceChange }: DropInToggleRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [priceError, setPriceError] = useState(false);

  function handleToggle(next: boolean) {
    if (next && price <= 0) {
      // Block activation when there's no price — focus the input + flash the hint.
      setPriceError(true);
      inputRef.current?.focus();
      return;
    }
    setPriceError(false);
    onChange(next);
  }

  function handlePriceChange(next: number) {
    if (next > 0) setPriceError(false);
    onPriceChange(next);
  }

  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">Tillat drop-in</p>
        <div className="mt-2.5 flex items-center gap-2.5">
          <label htmlFor="overview-drop-in-price" className="text-base text-foreground-muted">
            Pris per time
          </label>
          <div className="relative inline-flex items-center">
            <Input
              ref={inputRef}
              id="overview-drop-in-price"
              type="number"
              min={0}
              step={50}
              value={price === 0 ? '' : price}
              onChange={(e) => {
                const next = Number(e.target.value);
                handlePriceChange(Number.isFinite(next) ? next : 0);
              }}
              aria-invalid={priceError || undefined}
              className="h-8 w-[120px] pr-9 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 text-sm text-foreground/60 select-none">
              kr
            </span>
          </div>
        </div>
        {priceError && (
          <p className="mt-2 text-sm text-danger">Sett en pris før du slår på drop-in.</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={handleToggle} className="mt-1 shrink-0" />
    </div>
  );
}
