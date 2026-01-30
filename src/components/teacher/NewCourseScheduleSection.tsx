import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Check,
  MapPin,
  AlertCircle,
  CalendarClock,
  X,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { DurationPicker } from '@/components/ui/duration-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';

type CourseType = 'series' | 'single';

interface FormErrors {
  title?: string;
  startDate?: string;
  startTime?: string;
  duration?: string;
  weeks?: string;
  eventDays?: string;
  location?: string;
  price?: string;
  capacity?: string;
}

interface SessionDate {
  dayNumber: number;
  date: Date;
  formattedDate: string;
  time: string;
  isPrimary: boolean;
}

interface NewCourseScheduleSectionProps {
  courseType: CourseType;
  startDate: Date | undefined;
  startTime: string;
  duration: number | null;
  weeks: string;
  eventDays: string;
  sessionTimes: Record<number, string>;
  location: string;
  price: string;
  capacity: string;
  isWeeksOpen: boolean;
  isDaysOpen: boolean;
  endDate: Date | null;
  sessionDates: SessionDate[];
  errors: FormErrors;
  touched: Record<string, boolean>;
  submitAttempted: boolean;
  organizationId: string | undefined;

  // Refs
  weeksRef: React.RefObject<HTMLButtonElement | null>;
  eventDaysRef: React.RefObject<HTMLButtonElement | null>;
  locationRef: React.RefObject<HTMLInputElement | null>;
  priceRef: React.RefObject<HTMLInputElement | null>;
  capacityRef: React.RefObject<HTMLInputElement | null>;

  // Callbacks
  onStartDateChange: (date: Date | undefined) => void;
  onStartTimeChange: (time: string) => void;
  onDurationChange: (val: number | null) => void;
  onWeeksChange: (weeks: string) => void;
  onEventDaysChange: (days: string) => void;
  onWeeksOpenChange: (open: boolean) => void;
  onDaysOpenChange: (open: boolean) => void;
  onLocationChange: (location: string) => void;
  onPriceChange: (price: string) => void;
  onCapacityChange: (capacity: string) => void;
  onBlur: (field: string) => void;
  onTouchedChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  showError: (field: keyof FormErrors) => string | false | undefined;
  updateSessionTime: (dayIndex: number, time: string) => void;
  resetSessionTime: (dayIndex: number) => void;
}

function NewCourseScheduleSection({
  courseType,
  startDate,
  startTime,
  duration,
  weeks,
  eventDays,
  sessionTimes,
  location,
  price,
  capacity,
  isWeeksOpen,
  isDaysOpen,
  endDate,
  sessionDates,
  errors,
  touched,
  submitAttempted,
  organizationId,
  weeksRef,
  eventDaysRef,
  locationRef,
  priceRef,
  capacityRef,
  onStartDateChange,
  onStartTimeChange,
  onDurationChange,
  onWeeksChange,
  onEventDaysChange,
  onWeeksOpenChange,
  onDaysOpenChange,
  onLocationChange,
  onPriceChange,
  onCapacityChange,
  onBlur,
  onTouchedChange,
  showError,
  updateSessionTime,
  resetSessionTime,
}: NewCourseScheduleSectionProps) {
  return (
    <section className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
      {/* Sub-section 1: Når skjer det? */}
      <div className="p-6 md:p-8">
        <h2 className="text-lg font-medium text-text-primary mb-5">Når skjer det?</h2>

        {/* Date, Time, Duration, Weeks/Days */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Start Date */}
        <div className="col-span-1">
          <label htmlFor="start-date" className="block text-xs font-medium text-muted-foreground mb-1.5">
            {courseType === 'single' ? 'Dato' : 'Startdato'} <span className="text-destructive">*</span>
          </label>
          <DatePicker
            id="start-date"
            value={startDate}
            onChange={(date) => {
              onStartDateChange(date);
              onTouchedChange(prev => ({ ...prev, startDate: true }));
            }}
            onBlur={() => onBlur('startDate')}
            error={!!showError('startDate')}
            placeholder="Velg dato"
          />
          {showError('startDate') && (
            <p id="startDate-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {errors.startDate}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="col-span-1">
          <label htmlFor="start-time" className="block text-xs font-medium text-muted-foreground mb-1.5">
            Starttid <span className="text-destructive">*</span>
          </label>
          <TimePicker
            id="start-time"
            value={startTime}
            onChange={(time) => {
              onStartTimeChange(time);
              onTouchedChange(prev => ({ ...prev, startTime: true }));
            }}
            date={startDate}
            organizationId={organizationId}
            duration={duration || 60}
            error={!!showError('startTime')}
            placeholder="Velg tid"
          />
          {showError('startTime') && (
            <p id="startTime-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              {errors.startTime}
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="col-span-1">
          <DurationPicker
            id="duration"
            value={duration}
            onChange={(val) => {
              onDurationChange(val);
              onTouchedChange(prev => ({ ...prev, duration: true }));
            }}
            label="Varighet"
            required
            presets={[30, 45, 60, 75, 90, 120]}
            min={15}
            max={240}
            step={5}
            error={errors.duration}
            showErrors={touched.duration || submitAttempted}
          />
        </div>

        {/* Weeks/Days */}
        {courseType === 'series' ? (
          <div className="col-span-1">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1.5">
              Uker <span className="text-destructive">*</span>
              <InfoTooltip content="Hvor mange uker kurset varer" />
            </label>
            <Popover open={isWeeksOpen} onOpenChange={onWeeksOpenChange}>
              <PopoverTrigger asChild>
                <button
                  ref={weeksRef}
                  type="button"
                  onBlur={() => onBlur('weeks')}
                  aria-describedby={showError('weeks') ? 'weeks-error' : undefined}
                  aria-invalid={showError('weeks') ? 'true' : undefined}
                  aria-required="true"
                  className={`flex items-center justify-between w-full h-10 rounded-xl border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                    showError('weeks') ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <span className={weeks ? 'text-text-primary' : 'text-text-tertiary'}>{weeks || 'Velg'}</span>
                  <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isWeeksOpen ? 'rotate-180' : ''} ${showError('weeks') ? 'text-destructive' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[140px] p-3 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => (
                    <button
                      key={week}
                      type="button"
                      onClick={() => {
                        onWeeksChange(week.toString());
                        onWeeksOpenChange(false);
                        onTouchedChange(prev => ({ ...prev, weeks: true }));
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-normal transition-colors ${
                        weeks === week.toString()
                          ? 'bg-text-primary text-white'
                          : 'text-sidebar-foreground hover:bg-secondary hover:text-text-primary'
                      }`}
                    >
                      <span>{week}</span>
                      {weeks === week.toString() && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {showError('weeks') && (
              <p id="weeks-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.weeks}
              </p>
            )}
          </div>
        ) : (
          <div className="col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Dager <span className="text-destructive">*</span>
            </label>
            <Popover open={isDaysOpen} onOpenChange={onDaysOpenChange}>
              <PopoverTrigger asChild>
                <button
                  ref={eventDaysRef}
                  type="button"
                  onBlur={() => onBlur('eventDays')}
                  aria-describedby={showError('eventDays') ? 'eventDays-error' : undefined}
                  aria-invalid={showError('eventDays') ? 'true' : undefined}
                  aria-required="true"
                  className={`flex items-center justify-between w-full h-10 rounded-xl border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                    showError('eventDays') ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <span className={eventDays ? 'text-text-primary' : 'text-text-tertiary'}>{eventDays || 'Velg'}</span>
                  <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isDaysOpen ? 'rotate-180' : ''} ${showError('eventDays') ? 'text-destructive' : ''}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[140px] p-3 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        onEventDaysChange(day.toString());
                        onDaysOpenChange(false);
                        onTouchedChange(prev => ({ ...prev, eventDays: true }));
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-normal transition-colors ${
                        eventDays === day.toString()
                          ? 'bg-text-primary text-white'
                          : 'text-sidebar-foreground hover:bg-secondary hover:text-text-primary'
                      }`}
                    >
                      <span>{day}</span>
                      {eventDays === day.toString() && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {showError('eventDays') && (
              <p id="eventDays-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.eventDays}
              </p>
            )}
          </div>
        )}
      </div>

        {/* End date feedback - shows only when startDate + weeks are set for series with 2+ weeks */}
        {courseType === 'series' && endDate && parseInt(weeks) >= 2 && (
          <p className="text-sm text-muted-foreground mt-3">
            Slutter {format(endDate, 'd. MMMM', { locale: nb })}
          </p>
        )}

        {/* Session Schedule Panel - Shows when single course has 2+ days */}
        {courseType === 'single' && parseInt(eventDays) >= 2 && startDate && startTime && (
        <div className="bg-surface rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Øktplan
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {sessionDates.map((session, index) => (
              <div
                key={session.dayNumber}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg ${
                  session.isPrimary
                    ? 'bg-white/50 text-text-tertiary'
                    : 'bg-white border border-gray-200 ios-ease hover:border-ring'
                }`}
              >
                {/* Row 1 on mobile: Day + Date */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  {/* Day label */}
                  <div className="w-12 sm:w-14 flex flex-col shrink-0">
                    <span className={`text-xxs font-medium uppercase tracking-wider ${
                      session.isPrimary ? 'opacity-70' : 'text-text-primary'
                    }`}>
                      Dag {session.dayNumber}
                    </span>
                  </div>

                  {/* Date */}
                  <div className={`flex-1 text-sm font-medium capitalize ${
                    session.isPrimary ? 'text-text-tertiary' : 'text-text-primary'
                  }`}>
                    {session.formattedDate}
                  </div>
                </div>

                {/* Row 2 on mobile: Time + Reset */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pl-[calc(3rem+0.75rem)] sm:pl-0">
                  {/* Time input or display */}
                  {session.isPrimary ? (
                    <div className="flex items-center gap-1.5 text-sm text-text-tertiary">
                      <Clock className="h-3.5 w-3.5" />
                      {session.time}
                    </div>
                  ) : (
                    <div className="w-24 sm:w-28">
                      <Input
                        type="time"
                        value={session.time}
                        onChange={(e) => {
                          const time = e.target.value;
                          if (time === startTime) {
                            resetSessionTime(index);
                          } else {
                            updateSessionTime(index, time);
                          }
                        }}
                        className={`h-8 text-sm ${
                          sessionTimes[index]
                            ? 'border-warning/30 ring-1 ring-warning/20'
                            : ''
                        }`}
                      />
                    </div>
                  )}

                  {/* Primary label or reset button */}
                  <div className="w-14 sm:w-16 text-right shrink-0">
                    {session.isPrimary ? (
                      <span className="text-xs text-text-tertiary opacity-70">Hovedtid</span>
                    ) : sessionTimes[index] ? (
                      <button
                        type="button"
                        onClick={() => resetSessionTime(index)}
                        className="text-text-tertiary hover:text-destructive p-1 rounded-md transition-colors"
                        title="Tilbakestill"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Sub-section 2: Hvor? */}
      <div className="p-6 md:p-8 border-t border-surface-elevated">
        <h2 className="text-lg font-medium text-text-primary mb-5">Hvor?</h2>

        {/* Location - uses same grid for alignment */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="col-span-2">
            <label htmlFor="location" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sted <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                ref={locationRef}
                id="location"
                type="text"
                placeholder="F.eks. Studioet, Grünerløkka"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                onBlur={() => onBlur('location')}
                aria-describedby={showError('location') ? 'location-error' : undefined}
                aria-invalid={showError('location') ? 'true' : undefined}
                aria-required="true"
                className={`w-full h-10 rounded-xl border pl-9 pr-3 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                  showError('location') ? 'border-destructive' : 'border-border'
                }`}
              />
              <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${showError('location') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
            </div>
            {showError('location') && (
              <p id="location-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.location}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sub-section 3: Påmelding */}
      <div className="p-6 md:p-8 border-t border-surface-elevated">
        <h2 className="text-lg font-medium text-text-primary mb-5">Påmelding</h2>

        {/* Price & Capacity - uses same grid for alignment */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Price */}
          <div className="col-span-1">
            <label htmlFor="price" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Pris <span className="text-destructive">*</span>
              <span className="ml-2 text-xxs font-normal text-muted-foreground">per person</span>
            </label>
            <div className="relative">
              <input
                ref={priceRef}
                id="price"
                type="number"
                placeholder="0"
                min="0"
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                onBlur={() => onBlur('price')}
                aria-describedby={showError('price') ? 'price-error' : undefined}
                aria-invalid={showError('price') ? 'true' : undefined}
                aria-required="true"
                className={`w-full h-10 rounded-xl border pl-3 pr-12 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                  showError('price') ? 'border-destructive' : 'border-border'
                }`}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className={`text-xs ${showError('price') ? 'text-destructive' : 'text-muted-foreground'}`}>NOK</span>
              </div>
            </div>
            {showError('price') && (
              <p id="price-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.price}
              </p>
            )}
          </div>

          {/* Capacity */}
          <div className="col-span-1">
            <label htmlFor="capacity" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Maks antall <span className="text-destructive">*</span>
            </label>
            <input
              ref={capacityRef}
              id="capacity"
              type="number"
              placeholder=""
              min="1"
              value={capacity}
              onChange={(e) => onCapacityChange(e.target.value)}
              onBlur={() => onBlur('capacity')}
              aria-describedby={showError('capacity') ? 'capacity-error' : undefined}
              aria-invalid={showError('capacity') ? 'true' : undefined}
              aria-required="true"
              className={`w-full h-10 rounded-xl border px-3 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                showError('capacity') ? 'border-destructive' : 'border-border'
              }`}
            />
            {showError('capacity') && (
              <p id="capacity-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.capacity}
              </p>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}

export { NewCourseScheduleSection };
