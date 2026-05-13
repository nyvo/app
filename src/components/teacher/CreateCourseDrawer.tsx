import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle } from '@/lib/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationCombobox } from '@/components/ui/location-combobox';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { createCourse } from '@/services/courses';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
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
  location?: string;
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
 * Quick-create drawer — the minimum viable course. Six required fields
 * (type, title, date, time, location, capacity, price) get the teacher to
 * a draft course in under a minute. All advanced configuration —
 * description, image, additional ticket tiers — lives on the full course
 * page at /courses/:id where the user lands after creation.
 */
export function CreateCourseDrawer({ open, onOpenChange }: CreateCourseDrawerProps) {
  const navigate = useNavigate();
  const { currentSeller } = useAuth();
  const { locations } = useLocations(currentSeller?.id);

  const [format, setFormat] = useState<FormatType>('single');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weeks, setWeeks] = useState('');
  const [location, setLocation] = useState('');
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
      else if (isNaN(w) || w < 1 || w > 50) e.weeks = 'Mellom 1 og 50';
    }
    if (!location.trim()) e.location = 'Velg sted';
    const cap = parseInt(capacity, 10);
    if (!capacity) e.capacity = 'Skriv inn antall plasser';
    else if (isNaN(cap) || cap < 1) e.capacity = 'Må være minst 1';
    if (price === '') e.price = 'Skriv inn pris';
    else {
      const pri = parseInt(price, 10);
      if (isNaN(pri) || pri < 0) e.price = 'Må være 0 eller mer';
    }
    return e;
  }, [title, startDate, startTime, endTime, format, weeks, location, capacity, price]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (field: keyof FormErrors) => submitAttempted && !!errors[field];

  const reset = () => {
    setFormat('single');
    setTitle('');
    setStartDate(undefined);
    setStartTime('');
    setEndTime('');
    setWeeks('');
    setLocation('');
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
      const dayName = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(startDate);
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const timeRange = `${startTime}–${endTime}`;
      const timeSchedule =
        format === 'series'
          ? `${capitalizedDay}er, ${timeRange}`
          : `${capitalizedDay}, ${timeRange}`;
      const duration = timeToMin(endTime) - timeToMin(startTime);

      const dbFormat: CourseFormat = format;
      const { data: created, error } = await createCourse(
        {
          seller_id: currentSeller.id,
          title: title.trim(),
          format: dbFormat,
          start_date: formatLocalDateKey(startDate),
          time_schedule: timeSchedule,
          duration,
          total_weeks: format === 'series' ? parseInt(weeks, 10) : null,
          location: location.trim(),
          price: parseInt(price, 10) || 0,
          max_participants: parseInt(capacity, 10),
          status: 'draft' as const,
        },
        { eventDays: format === 'single' ? 1 : undefined },
      );

      if (error || !created) {
        setSubmitError(error?.message || 'Kunne ikke opprette kurset');
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
          <SheetTitle className="text-base font-semibold">Opprett kurs</SheetTitle>
          <SheetDescription className="text-xs text-foreground-muted">
            Bare det viktigste — du kan endre alle detaljer på kurssiden etterpå.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Type — Én gang / Flere ganger */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">
              Hvor mange ganger?
            </label>
            <SegmentedTabs<FormatType>
              value={format}
              onChange={setFormat}
              tabs={[
                { key: 'single', label: 'Én gang' },
                { key: 'series', label: 'Flere ganger' },
              ]}
              ariaLabel="Kursformat"
              stretch
            />
          </div>

          {/* Tittel */}
          <div>
            <label htmlFor="cc-title" className="text-sm font-medium mb-2 block text-foreground">
              Tittel
            </label>
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

          {/* Dato */}
          <div>
            <label htmlFor="cc-date" className="text-sm font-medium mb-2 block text-foreground">
              {format === 'single' ? 'Dato' : 'Startdato'}
            </label>
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

          {/* Antall uker — only for series */}
          {format === 'series' && (
            <div>
              <label htmlFor="cc-weeks" className="text-sm font-medium mb-2 block text-foreground">
                Antall uker
              </label>
              <Input
                id="cc-weeks"
                type="number"
                inputMode="numeric"
                min="1"
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

          {/* Tidspunkt — start + slutt */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">Tidspunkt</label>
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
              <span aria-hidden="true" className="shrink-0 text-sm font-medium text-foreground-muted">
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

          {/* Sted */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">Sted</label>
            <LocationCombobox
              value={location}
              onChange={setLocation}
              locations={locations}
              placeholder="Velg sted"
              aria-invalid={showError('location') ? 'true' : undefined}
              aria-label="Sted"
            />
            {showError('location') && <FieldError>{errors.location}</FieldError>}
          </div>

          {/* Antall plasser */}
          <div>
            <label htmlFor="cc-capacity" className="text-sm font-medium mb-2 block text-foreground">
              Antall plasser
            </label>
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

          {/* Pris */}
          <div>
            <label htmlFor="cc-price" className="text-sm font-medium mb-2 block text-foreground">
              Pris
              <span className="ml-2 text-xs font-normal text-foreground-muted">
                Sett til 0 for gratis
              </span>
            </label>
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
            {showError('price') && <FieldError>{errors.price}</FieldError>}
          </div>

          {submitError && (
            <p
              className="text-xs font-medium flex items-center gap-1 text-danger"
              role="alert"
            >
              <AlertCircle className="size-3" aria-hidden />
              {submitError}
            </p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            loadingText="Oppretter…"
          >
            Opprett
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-medium mt-2 flex items-center gap-1 text-danger"
      role="alert"
    >
      <AlertCircle className="size-3" aria-hidden />
      {children}
    </p>
  );
}
