import { useRef, useState } from 'react';
import { AlertCircle, Clock } from '@/lib/icons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MappedCourse } from '@/hooks/use-course-detail';

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
  /** Routes to /innstillinger/utbetaling. Used when the blocker banner CTA is clicked. */
  onSetupDinteroClick: () => void;
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
}: CourseOverviewTabProps) {
  const isSeries = course.format === 'series';
  const status = course.status;

  const isWaitingForDintero =
    status === 'draft' &&
    !dinteroOnboardingComplete &&
    dinteroOnboardingStatus !== null &&
    WAITING_STATUSES.has(dinteroOnboardingStatus);

  const isBlockedByDintero =
    status === 'draft' &&
    !dinteroOnboardingComplete &&
    !isWaitingForDintero;

  const showTogglesCard = status === 'draft' || status === 'upcoming' || status === 'active';
  const showKursplanCard = isSeries && (status === 'upcoming' || status === 'active');

  const kursplanSub =
    status === 'upcoming'
      ? `${course.totalWeeks} timer · starter ${formatNorwegianDate(course.startDate)}`
      : `${course.totalWeeks} timer · pågår`;

  return (
    <div className="space-y-4">
      {isWaitingForDintero && (
        <InfoBanner
          title="Venter på godkjenning fra Dintero."
          sub="Vi varsler deg på e-post når den er godkjent. Det tar vanligvis 1–2 virkedager."
          action={{ label: 'Se status', onClick: onSetupDinteroClick }}
        />
      )}

      {isBlockedByDintero && (
        <WarningBanner
          title="Sett opp utbetaling før du publiserer."
          sub="Kurset kan ikke ta imot påmeldinger før det er koblet til Dintero."
          action={{ label: 'Sett opp utbetaling', onClick: onSetupDinteroClick }}
        />
      )}

      {showKursplanCard && (
        <KursplanSection sub={kursplanSub} onOpen={onOpenKursplan} />
      )}

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
        <Card className="p-0 gap-0">
          <DropInToggleRow
            checked={allowsDropIn}
            onChange={onAllowsDropInChange}
            price={dropInPrice}
            onPriceChange={onDropInPriceChange}
          />
          <ToggleRow
            label="Tillat påmelding etter oppstart"
            help="Prisen blir justert automatisk etter antall uker igjen."
            checked={acceptsLateSignups}
            onChange={onAcceptsLateSignupsChange}
            isLast
          />
        </Card>
      )}
    </div>
  );
}

// ─── Banner ────────────────────────────────────────────────────────────

interface BannerProps {
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}

function WarningBanner({ title, sub, action }: BannerProps) {
  return (
    <BaseBanner
      title={title}
      sub={sub}
      action={action}
      tone="warning"
      icon={<AlertCircle className="size-5" />}
    />
  );
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
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-foreground-muted mt-0.5">{sub}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Section row (compact card: title + sub + action) ─────────────────

function KursplanSection({ sub, onOpen }: { sub: string; onOpen: () => void }) {
  return (
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">Kursplan</p>
          <p className="text-sm text-foreground-muted mt-0.5">{sub}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpen}>
          Se kursplan
        </Button>
      </div>
    </Card>
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
    <Card className="px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="text-sm text-foreground-muted mt-0.5">{sub}</p>
        </div>
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Toggle row (label + switch, optional help, optional price input) ─

interface ToggleRowProps {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  isLast?: boolean;
  children?: React.ReactNode;
}

function ToggleRow({ label, help, checked, onChange, isLast, children }: ToggleRowProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-6 px-6 py-5',
        !isLast && 'border-b border-border-subtle',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        {help && (
          <p className="text-sm text-foreground-muted mt-1">{help}</p>
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
    <div className="flex items-start justify-between gap-6 px-6 py-5 border-b border-border-subtle">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">Tillat drop-in</p>
        <div className="mt-2.5 flex items-center gap-2.5">
          <label htmlFor="overview-drop-in-price" className="text-sm text-foreground-muted">
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
