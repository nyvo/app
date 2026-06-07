import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse } from '@/services/courses';
import { friendlyError } from '@/lib/error-messages';
import { routes } from '@/lib/routes';
import { cn, formatKroner } from '@/lib/utils';
import { formatLocalDateKey } from '@/utils/dateUtils';
import type { CourseFormat } from '@/types/database';

interface CreateCourseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormatType = 'single' | 'series';

interface FormErrors {
  title?: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  weeks?: string;
  days?: string;
  capacity?: string;
  price?: string;
}

function generateTimeSlots(startHour = 6, endHour = 23): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  slots.push(`${String(endHour).padStart(2, '0')}:00`);
  return slots;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const ALL_TIME_SLOTS = generateTimeSlots();

/**
 * Quick-create drawer — the minimum viable course. Required fields
 * (type, title, date, time, capacity, price) get the teacher to a draft
 * course in under a minute. Description, cover image, instructor, and
 * location are deferred to the course page at /courses/:id, where the
 * PublishChecklist surfaces what's still needed before publishing.
 */
export function CreateCourseDrawer({ open, onOpenChange }: CreateCourseDrawerProps) {
  const navigate = useNavigate();
  const { currentSeller } = useAuth();

  // Quick-create captures only the saveable-as-draft minimum (type, title,
  // dates, time, capacity, price). Description, image, instructor, and
  // location are deferred to the course detail page where the teacher
  // works against the real shape of the course, not a drawer form.

  const [format, setFormat] = useState<FormatType>('single');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('1');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Skriv inn tittel';
    if (!startDate) e.startDate = 'Velg dato';
    if (!startTime) e.startTime = 'Velg starttid';
    if (!endTime) e.endTime = 'Velg sluttid';
    else if (startTime && timeToMin(endTime) <= timeToMin(startTime)) {
      e.endTime = 'Må være etter starttid';
    }
    if (format === 'series') {
      const w = parseInt(weeks, 10);
      if (!weeks) e.weeks = 'Skriv inn antall uker';
      else if (isNaN(w) || w < 2 || w > 50) e.weeks = 'Mellom 2 og 50';
    }
    if (format === 'single') {
      const d = parseInt(days, 10);
      if (!days) e.days = 'Skriv inn antall dager';
      else if (isNaN(d) || d < 1 || d > 10) e.days = 'Mellom 1 og 10';
    }
    const cap = parseInt(capacity, 10);
    if (!capacity) e.capacity = 'Skriv inn antall plasser';
    else if (isNaN(cap) || cap < 1) e.capacity = 'Må være minst 1';
    if (price === '') e.price = 'Skriv inn pris';
    else {
      const pri = parseInt(price, 10);
      if (isNaN(pri) || pri < 0) e.price = 'Må være 0 eller mer';
    }
    return e;
  }, [title, startDate, startTime, endTime, format, weeks, days, capacity, price]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (field: keyof FormErrors) => submitAttempted && !!errors[field];

  const reset = () => {
    setFormat('single');
    setTitle('');
    setStartDate(undefined);
    setStartTime('');
    setEndTime('');
    setWeeks('');
    setDays('1');
    setCapacity('');
    setPrice('');
    setSubmitAttempted(false);
    setSubmitError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    if (!isValid || !currentSeller?.id || !startDate) return;

    setIsSubmitting(true);
    try {
      const eventDays = format === 'single' ? Math.max(1, parseInt(days, 10) || 1) : 1;
      const formatWeekday = (date: Date) => {
        const name = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(date);
        return name.charAt(0).toUpperCase() + name.slice(1);
      };
      const startDayName = formatWeekday(startDate);
      const timeRange = `${startTime}–${endTime}`;
      let timeSchedule: string;
      if (format === 'series') {
        timeSchedule = `${startDayName}er, ${timeRange}`;
      } else if (eventDays > 1) {
        const lastDate = new Date(startDate);
        lastDate.setDate(startDate.getDate() + eventDays - 1);
        timeSchedule = `${startDayName}–${formatWeekday(lastDate)}, ${timeRange}`;
      } else {
        timeSchedule = `${startDayName}, ${timeRange}`;
      }
      const duration = timeToMin(endTime) - timeToMin(startTime);

      const dbFormat: CourseFormat = format;
      const { data: created, error } = await createCourse(
        {
          seller_id: currentSeller.id,
          title: title.trim(),
          // Description, image, instructor, location are filled in on the
          // course detail page after creation — see PublishChecklist.
          description: null,
          instructor_name: null,
          format: dbFormat,
          start_date: formatLocalDateKey(startDate),
          time_schedule: timeSchedule,
          duration,
          total_weeks: format === 'series' ? parseInt(weeks, 10) : null,
          location: null,
          price:
            format === 'series'
              ? (parseInt(price, 10) || 0) * (parseInt(weeks, 10) || 0)
              : parseInt(price, 10) || 0,
          max_participants: parseInt(capacity, 10),
          status: 'draft' as const,
        },
        { eventDays: format === 'single' ? eventDays : undefined },
      );

      if (error || !created) {
        setSubmitError(friendlyError(error, 'Kunne ikke opprette kurset.'));
        setIsSubmitting(false);
        return;
      }

      toast.success('Kurs opprettet');
      reset();
      onOpenChange(false);
      navigate(routes.course(created.id));
    } catch {
      setSubmitError('Noe gikk galt. Prøv igjen.');
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 sm:max-w-[480px] w-full p-0"
      >
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Opprett kurs</SheetTitle>
          <SheetDescription className="text-base text-foreground-muted">
            Du kan legge til mer på kurssiden.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {/* Sections divided by hairline rules; the section headings were
              dropped in favor of just spacing + a divider — fewer words on
              screen, same scannable grouping. */}
          <div className="divide-y divide-border-subtle">
          <FormSection>
            <div>
              <FieldLabel>Type</FieldLabel>
              <SegmentedTabs<FormatType>
                value={format}
                onChange={setFormat}
                tabs={[
                  { key: 'single', label: 'Enkeltkurs' },
                  { key: 'series', label: 'Kursserie' },
                ]}
                ariaLabel="Type"
                stretch
              />
            </div>

            <div>
              <FieldLabel htmlFor="cc-title">
                Tittel
              </FieldLabel>
              <Input
                id="cc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={showError('title') ? 'true' : undefined}
                aria-required="true"
                className={cn(showError('title') && 'border-danger focus-visible:ring-danger')}
              />
              {showError('title') && <FieldError>{errors.title}</FieldError>}
            </div>
          </FormSection>

          <FormSection>
            <div>
              <FieldLabel htmlFor="cc-date">
                {format === 'series' || (parseInt(days, 10) || 1) > 1 ? 'Startdato' : 'Dato'}
              </FieldLabel>
              <DatePicker
                id="cc-date"
                value={startDate}
                onChange={setStartDate}
                error={!!showError('startDate')}
                placeholder="Velg dato"
                fromDate={new Date()}
                aria-invalid={showError('startDate') ? 'true' : undefined}
              />
              {showError('startDate') && <FieldError>{errors.startDate}</FieldError>}
            </div>

            {format === 'single' && (
              <div>
                <FieldLabel htmlFor="cc-days">
                  Antall dager
                </FieldLabel>
                <Input
                  id="cc-days"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  aria-invalid={showError('days') ? 'true' : undefined}
                  aria-required="true"
                  className={cn(showError('days') && 'border-danger focus-visible:ring-danger')}
                />
                {showError('days') && <FieldError>{errors.days}</FieldError>}
              </div>
            )}

            {format === 'series' && (
              <div>
                <FieldLabel htmlFor="cc-weeks">
                  Antall uker
                </FieldLabel>
                <Input
                  id="cc-weeks"
                  type="number"
                  inputMode="numeric"
                  min="2"
                  max="50"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  aria-invalid={showError('weeks') ? 'true' : undefined}
                  aria-required="true"
                  className={cn(showError('weeks') && 'border-danger focus-visible:ring-danger')}
                />
                {showError('weeks') && <FieldError>{errors.weeks}</FieldError>}
              </div>
            )}

            <div>
              <FieldLabel>Tidspunkt</FieldLabel>
              <div className="flex items-center gap-2">
                <Select
                  value={startTime}
                  onValueChange={(v) => {
                    setStartTime(v);
                    if (endTime && timeToMin(endTime) <= timeToMin(v)) setEndTime('');
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      'w-full',
                      showError('startTime') && 'border-danger focus-visible:ring-danger',
                    )}
                    aria-label="Starttid"
                    aria-invalid={showError('startTime') ? 'true' : undefined}
                  >
                    <SelectValue placeholder="Start" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALL_TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span aria-hidden="true" className="shrink-0 text-base font-medium text-foreground-muted">
                  –
                </span>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger
                    className={cn(
                      'w-full',
                      showError('endTime') && 'border-danger focus-visible:ring-danger',
                    )}
                    aria-label="Sluttid"
                    aria-invalid={showError('endTime') ? 'true' : undefined}
                  >
                    <SelectValue placeholder="Slutt" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALL_TIME_SLOTS.filter(
                      (slot) => !startTime || timeToMin(slot) > timeToMin(startTime),
                    ).map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showError('startTime') && <FieldError>{errors.startTime}</FieldError>}
              {!showError('startTime') && showError('endTime') && (
                <FieldError>{errors.endTime}</FieldError>
              )}
            </div>
          </FormSection>

          <FormSection>
            <div>
              <FieldLabel htmlFor="cc-capacity">
                Antall plasser
              </FieldLabel>
              <Input
                id="cc-capacity"
                type="number"
                inputMode="numeric"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                aria-invalid={showError('capacity') ? 'true' : undefined}
                aria-required="true"
                className={cn(showError('capacity') && 'border-danger focus-visible:ring-danger')}
              />
              {showError('capacity') && <FieldError>{errors.capacity}</FieldError>}
            </div>

            <div>
              <FieldLabel htmlFor="cc-price">
                {format === 'series' ? 'Pris per gang' : 'Pris'}
              </FieldLabel>
              <Input
                id="cc-price"
                type="number"
                inputMode="numeric"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={showError('price') ? 'true' : undefined}
                aria-required="true"
                className={cn(showError('price') && 'border-danger focus-visible:ring-danger')}
              />
              {format === 'series' && price !== '' && weeks !== '' && !showError('price') && !showError('weeks') && (
                <p className="mt-2 text-base text-foreground-muted">
                  Totalt {formatKroner((parseInt(price, 10) || 0) * (parseInt(weeks, 10) || 0))} for {parseInt(weeks, 10) || 0} uker
                </p>
              )}
              {showError('price') && <FieldError>{errors.price}</FieldError>}
            </div>
          </FormSection>

          </div>

          {submitError && (
            <Alert variant="error" size="sm" className="mt-6 mb-6">
              {submitError}
            </Alert>
          )}
        </div>

        {/* Sticky footer — primary action only; the sheet's X closes. */}
        <div className="border-t border-border px-6 py-4 bg-background">
          <Button
            onClick={handleSubmit}
            className="w-full"
            loading={isSubmitting}
            loadingText="Oppretter"
          >
            Opprett
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Small layout helpers (drawer-local) ───────────────────────────────

function FormSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="py-6 first:pt-6 last:pb-6 space-y-5">{children}</section>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-foreground"
    >
      {children}
    </label>
  );
}
