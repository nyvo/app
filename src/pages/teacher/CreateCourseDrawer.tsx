import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, Clock } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { DatePicker } from '@/components/ui/date-picker';
import { FieldError } from '@/components/ui/field-error';
import { ImageField } from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnsavedChangesDialog, useUnsavedChanges } from '@/components/ui/unsaved-changes';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import {
  SessionDaysEditor,
  newSessionDay,
  timeToMin,
  ALL_TIME_SLOTS,
  endTimeSlotsFor,
} from '@/components/teacher/SessionDaysEditor';
import type { SessionDay } from '@/components/teacher/SessionDaysEditor';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { LocationField } from '@/components/ui/location-field';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse, publishCourse } from '@/services/courses';
import { publishNeedsPaymentSetup } from '@/lib/payments';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { friendlyError } from '@/lib/error-messages';
import { GENERIC_ERROR } from '@/lib/error-strings';
import { routes } from '@/lib/routes';
import { formatLocalDateKey } from '@/utils/dateUtils';
import { singleScheduleLabel, seriesScheduleLabel } from '@/utils/timeSchedule';
import type { CourseFormat } from '@/types/database';

type FormatType = 'single' | 'series';

interface FormErrors {
  title?: string;
  description?: string;
  location?: string;
  // series-only fields
  startDate?: string;
  startTime?: string;
  endTime?: string;
  weeks?: string;
  // single-only field (per-day editor)
  sessionDays?: string;
  capacity?: string;
  price?: string;
}

// Section header — title is text-base (matches SettingsRows; the page h1 "Nytt
// kurs" owns text-lg, so text-lg here competed with it), with an optional
// one-line muted description that says what the section is for. The description
// is what turns a bare list of inputs into guided sections.
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      {description && <p className="text-sm text-foreground-muted">{description}</p>}
    </div>
  );
}

interface FieldRenderProps {
  /** Set only when the field currently has an error — pass straight to the
   * control's `aria-describedby` (mirrors OnboardingPage's seller-field
   * pattern: FieldError renders with this same id). */
  errorId?: string;
  /** The label's own id — for controls that can't use native `<label for>`
   * (e.g. a contenteditable/role=textbox), wire this to `aria-labelledby`. */
  labelId?: string;
}

function Field({
  label,
  htmlFor,
  children,
  error,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode | ((field: FieldRenderProps) => React.ReactNode);
  /** Error message — when present, FieldError renders with an id and
   * `children` (as a render function) receives that id for aria-describedby. */
  error?: string;
}) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const labelId = htmlFor ? `${htmlFor}-label` : undefined;
  return (
    <div>
      <Label htmlFor={htmlFor} id={labelId}>{label}</Label>
      <div className="mt-2">
        {typeof children === 'function' ? children({ errorId, labelId }) : children}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

interface CreateCourseDrawerProps {
  onClose: () => void;
}

export default function CreateCourseDrawer({ onClose }: CreateCourseDrawerProps) {
  const navigate = useNavigate();
  const { currentSeller } = useAuth();

  const [format, setFormat] = useState<FormatType>('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // series fields
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weeks, setWeeks] = useState('');
  // single (multi-day) fields
  const [sessionDays, setSessionDays] = useState<SessionDay[]>(() => [newSessionDay()]);
  const [location, setLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<{
    lat: number | null;
    lon: number | null;
    placeId: string | null;
  } | null>(null);
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');

  // The teacher enters the full course price directly — input, stored value
  // and charged amount are the same number for both formats.
  const coursePriceTotal = parseInt(price, 10) || 0;

  // Cover image is picked locally and uploaded AFTER createCourse (the storage
  // path needs the new course id — same pattern as the course detail page).
  // ImageField owns the preview URL and file validation.
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Which footer action is in flight — only the clicked button shows its
  // spinner; the other is merely disabled.
  const [submitting, setSubmitting] = useState<'draft' | 'publish' | null>(null);
  // One key per builder visit — a retry after a failed request reuses it, so
  // a double submit can't create two courses (unique index on the column).
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  // Pro sellers who hit "Publiser" without payouts set up: the course is saved
  // as a draft, the gate dialog explains, and dismissing it lands them on the
  // (saved) course page.
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const errors = useMemo<FormErrors>(() => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = 'Skriv inn tittel';

    // Description is required; strip rich-text markup so an empty editor
    // (e.g. "<p></p>") doesn't count as filled.
    if (!description.replace(/<[^>]*>/g, '').trim()) e.description = 'Skriv inn beskrivelse';

    // Location must resolve to a real Google place (coords), not free text.
    if (!location.trim()) e.location = 'Velg et sted';
    else if (!locationCoords?.placeId) e.location = 'Velg et sted fra listen.';

    if (format === 'series') {
      if (!startDate) e.startDate = 'Velg dato';
      if (!startTime) e.startTime = 'Velg starttid';
      if (!endTime) e.endTime = 'Velg sluttid';
      else if (startTime && timeToMin(endTime) <= timeToMin(startTime)) {
        e.endTime = 'Må være etter starttid';
      }
      const w = parseInt(weeks, 10);
      if (!weeks) e.weeks = 'Skriv inn antall uker';
      else if (isNaN(w) || w < 2 || w > 50) e.weeks = 'Mellom 2 og 50';
    }

    if (format === 'single') {
      const invalidDay = sessionDays.find(
        (d) =>
          !d.date ||
          !d.startTime ||
          !d.endTime ||
          timeToMin(d.endTime) <= timeToMin(d.startTime),
      );
      if (sessionDays.length === 0 || invalidDay) {
        e.sessionDays = 'Alle dager må ha dato, starttid og sluttid (sluttid etter starttid)';
      } else {
        const dateKeys = sessionDays.map((d) => formatLocalDateKey(d.date!));
        if (new Set(dateKeys).size !== dateKeys.length) {
          e.sessionDays = 'To dager kan ikke ha samme dato';
        }
      }
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
  }, [title, description, location, locationCoords, startDate, startTime, endTime, format, weeks, sessionDays, capacity, price]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (field: keyof FormErrors) => submitAttempted && !!errors[field];

  // With the actions pinned in the footer, validation errors can sit
  // scrolled off-screen — bring the first invalid field into view and focus
  // it so a failed submit never looks like a dead click.
  const FIELD_ANCHORS: [keyof FormErrors, string][] = [
    ['title', 'cb-title'],
    ['description', 'cb-description'],
    ['location', 'cb-location'],
    ['startDate', 'cb-date'],
    ['startTime', 'cb-start-time'],
    ['endTime', 'cb-end-time'],
    ['weeks', 'cb-weeks'],
    ['sessionDays', 'cb-session-days'],
    ['capacity', 'cb-capacity'],
    ['price', 'cb-price'],
  ];

  const focusFirstInvalidField = () => {
    const anchor = FIELD_ANCHORS.find(([field]) => errors[field]);
    if (!anchor) return;
    const el = document.getElementById(anchor[1]);
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    const focusable = el.matches('input, button, textarea, select')
      ? el
      : el.querySelector<HTMLElement>('[contenteditable="true"]') ??
        el.querySelector<HTMLElement>('input, button, textarea, select');
    focusable?.focus({ preventScroll: true });
  };

  // Anything typed or picked counts as unsaved work until createDraft lands —
  // the whole form is lost on navigation since nothing persists before then.
  const isDirty = useMemo(
    () =>
      title.trim() !== '' ||
      description.replace(/<[^>]*>/g, '').trim() !== '' ||
      location.trim() !== '' ||
      capacity !== '' ||
      price !== '' ||
      weeks !== '' ||
      startDate != null ||
      startTime !== '' ||
      endTime !== '' ||
      imageFile != null ||
      sessionDays.some((d) => d.date != null || d.startTime !== '' || d.endTime !== ''),
    [title, description, location, capacity, price, weeks, startDate, startTime, endTime, imageFile, sessionDays],
  );
  const { blocker, bypass } = useUnsavedChanges(isDirty);

  // Creates the course as a draft (+ uploads the cover image). Returns the new
  // course id, or null if validation failed or the request errored. Both
  // footer actions go through this — "Publiser" then flips the draft live.
  const createDraft = async (action: 'draft' | 'publish'): Promise<string | null> => {
    setSubmitAttempted(true);
    if (!isValid) {
      focusFirstInvalidField();
      return null;
    }
    if (!currentSeller?.id) return null;
    // For series we still need startDate; for single the days carry their own dates.
    if (format === 'series' && !startDate) return null;

    setSubmitting(action);
    try {
      let courseStartDate: string;
      let timeSchedule: string;
      let duration: number;
      let createOptions: Parameters<typeof createCourse>[1];

      if (format === 'single') {
        // Sort chronologically — entry order isn't guaranteed, and start_date/
        // end_date/session_number all derive from position. Dates are
        // guaranteed non-null here (validation passed).
        const sortedDays = [...sessionDays].sort((a, b) =>
          formatLocalDateKey(a.date!).localeCompare(formatLocalDateKey(b.date!)),
        );
        const day0 = sortedDays[0];
        courseStartDate = formatLocalDateKey(day0.date!);
        timeSchedule = singleScheduleLabel(day0.date!, day0.startTime, day0.endTime);
        duration = timeToMin(day0.endTime) - timeToMin(day0.startTime);
        createOptions = {
          sessionDays: sortedDays.map((d) => ({
            date: formatLocalDateKey(d.date!),
            startTime: d.startTime,
            endTime: d.endTime,
          })),
        };
      } else {
        // series — startDate is guaranteed non-null (validated above)
        timeSchedule = seriesScheduleLabel(startDate!, startTime, endTime);
        duration = timeToMin(endTime) - timeToMin(startTime);
        courseStartDate = formatLocalDateKey(startDate!);
        // Structured time for the weekly session generation — createCourse
        // must never have to parse it back out of the display label.
        createOptions = { seriesStartTime: startTime, seriesEndTime: endTime };
      }

      const dbFormat: CourseFormat = format;
      const { data: created, error } = await createCourse(
        {
          seller_id: currentSeller.id,
          title: title.trim(),
          description: description.trim() || null,
          instructor_name: null,
          format: dbFormat,
          start_date: courseStartDate,
          time_schedule: timeSchedule,
          duration,
          total_weeks: format === 'series' ? parseInt(weeks, 10) : null,
          location: location.trim() || null,
          location_address: locationAddress.trim() || null,
          location_lat: locationCoords?.lat ?? null,
          location_lon: locationCoords?.lon ?? null,
          location_place_id: locationCoords?.placeId ?? null,
          price: coursePriceTotal,
          max_participants: parseInt(capacity, 10),
          status: 'draft' as const,
          idempotency_key: idempotencyKeyRef.current,
        },
        createOptions,
      );

      if (error || !created) {
        toast.error(friendlyError(error, 'Kunne ikke opprette kurset'));
        setSubmitting(null);
        return null;
      }

      // The draft exists in the DB from here on — the form is no longer
      // unsaved work, so navigation (save/publish/gate dialog) is safe.
      bypass();

      // Upload the picked cover image now that we have the course id. A failed
      // upload doesn't block creation — the teacher can add it on the course page.
      if (imageFile) {
        const { url, error: upErr } = await uploadCourseImage(created.id, imageFile);
        if (url && !upErr) {
          const { error: updErr } = await updateCourse(created.id, { image_url: url });
          if (updErr) {
            if (currentSeller?.id) void deleteCourseImage(created.id, url, currentSeller.id);
            toast.error('Bildet ble ikke lastet opp – legg det til fra kurssiden');
          }
        } else {
          toast.error('Bildet ble ikke lastet opp – legg det til fra kurssiden');
        }
      }

      return created.id;
    } catch {
      toast.error(GENERIC_ERROR);
      setSubmitting(null);
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const id = await createDraft('draft');
    if (!id) return;
    toast.success('Utkast lagret');
    navigate(routes.course(id));
  };

  const handlePublish = async () => {
    const id = await createDraft('publish');
    if (!id) return;
    // A paid course can't go live until Stripe payouts are set up. Keep the
    // draft, surface the gate dialog; dismissing it routes to the saved course page.
    if (publishNeedsPaymentSetup(currentSeller, coursePriceTotal > 0)) {
      setCreatedCourseId(id);
      setShowPublishDialog(true);
      setSubmitting(null);
      return;
    }
    const { error } = await publishCourse(id);
    if (error) {
      toast.error(friendlyError(error, 'Kurset er lagret, men kunne ikke publiseres'));
      navigate(routes.course(id));
      return;
    }
    toast.success('Kurset er publisert');
    navigate(routes.course(id));
  };

  return (
    <>
      <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent side="right" className="w-full gap-0">
          <SheetHeader>
            <SheetTitle>Nytt kurs</SheetTitle>
          </SheetHeader>

          {/* Fields sit directly on the panel (no utility card); sections are
              separated by hairline dividers instead of a card fill. Hierarchy is
              type-size + whitespace (Circle/Eventbrite create-event pattern). */}
          <div className="@container min-h-0 flex-1 overflow-y-auto px-6">
            <div className="divide-y divide-border-subtle">
              {/* Type — branches the whole form (Eventbrite puts "Type of event"
                  first), so it's the first choice and the only titled section. */}
              <section className="space-y-3 py-6">
                <SectionHeader
                  title="Type"
                  description="Enkelttime for én økt, eller kursrekke over flere uker."
                />
                <SegmentedTabs<FormatType>
                  value={format}
                  onChange={(v) => {
                    setFormat(v);
                  }}
                  tabs={[
                    { key: 'single', label: 'Enkelttime' },
                    { key: 'series', label: 'Kursrekke' },
                  ]}
                  ariaLabel="Type"
                  role="radiogroup"
                  stretch
                />
              </section>

              {/* Cover banner — a short banner, not a tall hero. */}
              <section className="space-y-3 py-6">
                <ImageField
                  value={null}
                  onChange={setImageFile}
                  onRemove={() => setImageFile(null)}
                  uploadLabel="Legg til et bilde"
                  pickerClassName="aspect-[3/1]"
                />
              </section>

              {/* Tittel + Beskrivelse */}
              <section className="space-y-5 py-6">
                <Field
                  label="Tittel"
                  htmlFor="cb-title"
                  error={showError('title') ? errors.title : undefined}
                >
                  {({ errorId }) => (
                    <Input
                      id="cb-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      aria-invalid={showError('title') ? 'true' : undefined}
                      aria-describedby={errorId}
                      aria-required="true"
                    />
                  )}
                </Field>

                <Field
                  label="Beskrivelse"
                  htmlFor="cb-description"
                  error={showError('description') ? errors.description : undefined}
                >
                  {({ errorId, labelId }) => (
                    <div id="cb-description">
                      <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        aria-labelledby={labelId}
                        aria-invalid={showError('description') ? 'true' : undefined}
                        aria-describedby={errorId}
                      />
                    </div>
                  )}
                </Field>
              </section>

              {/* Når */}
              <section className="space-y-5 py-6">
                {/* Single format: per-day editor */}
                {format === 'single' && (
                  <div id="cb-session-days">
                    <SessionDaysEditor value={sessionDays} onChange={setSessionDays} />
                    {showError('sessionDays') && (
                      <FieldError>{errors.sessionDays}</FieldError>
                    )}
                  </div>
                )}

                {/* Series format: Startdato + Tidspunkt + Antall uker */}
                {format === 'series' && (
                  <>
                    <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
                      <Field
                        label="Startdato"
                        htmlFor="cb-date"
                        error={showError('startDate') ? errors.startDate : undefined}
                      >
                        {({ errorId }) => (
                          <DatePicker
                            id="cb-date"
                            value={startDate}
                            onChange={setStartDate}
                            error={showError('startDate')}
                            placeholder="Velg dato"
                            fromDate={new Date()}
                            icon={Calendar}
                            aria-invalid={showError('startDate') ? 'true' : undefined}
                            aria-describedby={errorId}
                          />
                        )}
                      </Field>

                      {(() => {
                        const timeErrorId = 'cb-time-error';
                        const timeError = showError('startTime')
                          ? errors.startTime
                          : showError('endTime')
                            ? errors.endTime
                            : undefined;
                        return (
                          <fieldset>
                            <legend className="mb-2 block text-sm font-medium text-foreground">
                              Tidspunkt
                            </legend>
                            <div className="flex items-center gap-2">
                              <Select
                                value={startTime}
                                onValueChange={(v) => {
                                  setStartTime(v);
                                  if (endTime && timeToMin(endTime) <= timeToMin(v)) setEndTime('');
                                }}
                              >
                                <SelectTrigger
                                  id="cb-start-time"
                                  className="w-full gap-2.5"
                                  aria-label="Starttid"
                                  aria-invalid={showError('startTime') ? 'true' : undefined}
                                  aria-describedby={timeError ? timeErrorId : undefined}
                                >
                                  <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
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
                              <span
                                aria-hidden="true"
                                className="shrink-0 text-base font-medium text-foreground-muted"
                              >
                                –
                              </span>
                              <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger
                                  id="cb-end-time"
                                  className="w-full gap-2.5"
                                  aria-label="Sluttid"
                                  aria-invalid={showError('endTime') ? 'true' : undefined}
                                  aria-describedby={timeError ? timeErrorId : undefined}
                                >
                                  <Clock className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
                                  <SelectValue placeholder="Slutt" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {endTimeSlotsFor(startTime).map((slot) => (
                                    <SelectItem key={slot} value={slot}>
                                      {slot}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {timeError && <FieldError id={timeErrorId}>{timeError}</FieldError>}
                          </fieldset>
                        );
                      })()}
                    </div>

                    <Field
                      label="Antall uker"
                      htmlFor="cb-weeks"
                      error={showError('weeks') ? errors.weeks : undefined}
                    >
                      {({ errorId }) => (
                        <Input
                          id="cb-weeks"
                          type="number"
                          inputMode="numeric"
                          min="2"
                          max="50"
                          value={weeks}
                          onChange={(e) => setWeeks(e.target.value)}
                          aria-invalid={showError('weeks') ? 'true' : undefined}
                          aria-describedby={errorId}
                          aria-required="true"
                        />
                      )}
                    </Field>
                  </>
                )}
              </section>

              {/* Hvor og pris */}
              <section className="space-y-5 py-6">
                <Field
                  label="Sted"
                  htmlFor="cb-location"
                  error={showError('location') ? errors.location : undefined}
                >
                  {({ errorId }) => (
                    <LocationField
                      id="cb-location"
                      value={location}
                      coords={locationCoords}
                      address={locationAddress}
                      aria-invalid={showError('location')}
                      aria-describedby={errorId}
                      onChange={({ name, address, coords }) => {
                        setLocation(name);
                        setLocationAddress(address);
                        setLocationCoords(coords);
                      }}
                    />
                  )}
                </Field>

                <div className="grid gap-4 @sm:grid-cols-2">
                  <Field
                    label="Antall plasser"
                    htmlFor="cb-capacity"
                    error={showError('capacity') ? errors.capacity : undefined}
                  >
                    {({ errorId }) => (
                      <Input
                        id="cb-capacity"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        aria-invalid={showError('capacity') ? 'true' : undefined}
                        aria-describedby={errorId}
                        aria-required="true"
                      />
                    )}
                  </Field>

                  <Field
                    label={format === 'series' ? 'Pris for hele kurset' : 'Pris'}
                    htmlFor="cb-price"
                    error={showError('price') ? errors.price : undefined}
                  >
                    {({ errorId }) => (
                      <div className="relative">
                        <Input
                          id="cb-price"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          aria-invalid={showError('price') ? 'true' : undefined}
                          aria-describedby={errorId}
                          aria-required="true"
                          className="pr-10 tabular-nums"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-foreground-muted">
                          kr
                        </span>
                      </div>
                    )}
                  </Field>
                </div>
              </section>
            </div>
          </div>

          <SheetFooter className="flex-row items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleSaveDraft}
              loading={submitting === 'draft'}
              disabled={submitting === 'publish'}
              loadingText="Lagrer"
            >
              Lagre utkast
            </Button>
            <Button
              size="lg"
              onClick={handlePublish}
              loading={submitting === 'publish'}
              disabled={submitting === 'draft'}
              loadingText="Publiserer"
            >
              Publiser
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <PublishCourseDialog
        open={showPublishDialog}
        onOpenChange={(open) => {
          setShowPublishDialog(open);
          // Closing the gate (e.g. "Ikke nå") lands them on the saved draft.
          if (!open && createdCourseId) navigate(routes.course(createdCourseId));
        }}
        courseTitle={title.trim() || undefined}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
