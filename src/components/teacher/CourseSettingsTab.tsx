import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { FieldError } from '@/components/ui/field-error';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ImageField } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { LocationField, type LocationCoords } from '@/components/ui/location-field';
import {
  SessionDaysEditor,
  timeToMin,
  ALL_TIME_SLOTS,
  endTimeSlotsFor,
  type SessionDay,
} from '@/components/teacher/SessionDaysEditor';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CourseSettingsTabProps {
  // General info
  settingsTitle: string;
  onTitleChange: (title: string) => void;
  /** Inline error under the title input — set by the parent when a save is
   *  blocked (e.g. empty title). */
  titleError?: string | null;
  settingsDescription: string;
  onDescriptionChange: (description: string) => void;

  // Image
  settingsImageUrl: string | null;
  onImageFileChange: (file: File | null) => void;
  onImageRemove: () => void;
  isSaving: boolean;
  isImageSaving: boolean;

  // Location — committed as null when empty (per DB schema).
  settingsLocation: string;
  /** Street address of the picked place (shown under the name; persisted). */
  settingsLocationAddress: string;
  /** Current location coords — drives the map in the picker. */
  settingsLocationCoords: LocationCoords | null;
  onLocationChange: (location: string) => void;
  onLocationAddressChange: (address: string) => void;
  // Coords copied from the picked location onto the course (null when the
  // location is custom-typed or cleared).
  onLocationCoordsChange: (
    coords: { lat: number | null; lon: number | null; placeId: string | null } | null,
  ) => void;
  /** Inline error under the location field — set by the parent when a save is
   *  blocked (typed text without picking a place). */
  locationError?: string | null;

  // Schedule — for series, used as-is. For single, sessionDays takes over.
  settingsDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  settingsTime: string;
  onTimeChange: (time: string) => void;
  settingsDuration: number | null;
  onDurationChange: (duration: number | null) => void;

  // Per-day session editor — only rendered for single-format courses.
  // The parent keeps the state; this component only renders + forwards changes.
  sessionDays: SessionDay[];
  onSessionDaysChange: (days: SessionDay[]) => void;
  /** True when the course is published (upcoming/active). Disables add/remove
   *  of days to prevent destructive changes without refund/notification flows. */
  isPublished: boolean;

  // Capacity
  maxParticipants: number;
  onMaxParticipantsChange: (value: number) => void;
  currentEnrolled: number;

  // Pricing — the input IS the stored total for both formats (the full course
  // price the buyer is charged), matching the create flow's convention.
  courseFormat: 'single' | 'series';
  price: number;
  onPriceChange: (totalPrice: number) => void;

  // Drop-in (allowsDropIn, dropInPrice) and late-signups (acceptsLateSignups)
  // toggles moved to Oversikt tab — they're instant-commit operational
  // switches, not part of this saveable form.

  // Actions
  isDirty: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;

  // Destructive zone — gated by status. "Gjør til utkast" lives in the page
  // header's kebab menu (state change, not destructive), not here.
  // `courseStatus` is the persisted lifecycle (draft/upcoming/active/completed/
  // cancelled), kept honest by reconcile_course_lifecycle — so a finished
  // course reads `completed` directly.
  courseStatus: string;
  /** True when the course has ANY signup rows (confirmed or cancelled) — i.e.
   *  payment records exist that a hard delete would cascade-destroy. */
  hasSignupRecords: boolean;
  onRequestCancel: () => void;
  onRequestDelete: () => void;
}

export const CourseSettingsTab = ({
  settingsTitle,
  onTitleChange,
  titleError,
  settingsDescription,
  onDescriptionChange,
  settingsImageUrl,
  onImageFileChange,
  onImageRemove,
  isSaving,
  isImageSaving,
  settingsLocation,
  settingsLocationAddress,
  settingsLocationCoords,
  onLocationChange,
  onLocationAddressChange,
  onLocationCoordsChange,
  locationError,
  settingsDate,
  onDateChange,
  settingsTime,
  onTimeChange,
  settingsDuration,
  onDurationChange,
  sessionDays,
  onSessionDaysChange,
  isPublished,
  maxParticipants,
  onMaxParticipantsChange,
  currentEnrolled,
  courseFormat,
  price,
  onPriceChange,
  isDirty,
  saveError,
  onSave,
  onCancel,
  courseStatus,
  hasSignupRecords,
  onRequestCancel,
  onRequestDelete,
}: CourseSettingsTabProps) => {
  const minParticipants = Math.max(currentEnrolled || 1, 1);
  const [participantsInput, setParticipantsInput] = useState(String(maxParticipants));
  // Flashes the clamp explanation after a blur that snapped the typed value
  // back up to minParticipants — otherwise the reset reads as silent, as if
  // the keystroke never happened.
  const [showClampHint, setShowClampHint] = useState(false);

  const [priceInput, setPriceInput] = useState(String(price));

  const minToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Derive end time from start + duration
  const endTime = useMemo(() => {
    if (!settingsTime || !settingsDuration) return '';
    return minToTime(timeToMin(settingsTime) + settingsDuration);
  }, [settingsTime, settingsDuration]);

  const endTimeSlots = useMemo(() => endTimeSlotsFor(settingsTime), [settingsTime]);

  const handleEndTimeChange = (val: string) => {
    if (!settingsTime) return;
    const dur = timeToMin(val) - timeToMin(settingsTime);
    if (dur > 0) onDurationChange(dur);
  };

  useEffect(() => {
    setParticipantsInput(String(maxParticipants));
  }, [maxParticipants]);

  useEffect(() => {
    setPriceInput(String(price));
  }, [price]);

  const commitPriceInput = () => {
    const trimmed = priceInput.trim();
    if (trimmed === '') {
      setPriceInput(String(price));
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setPriceInput(String(price));
      return;
    }
    const normalized = Math.floor(parsed);
    if (normalized !== price) {
      onPriceChange(normalized);
    }
    setPriceInput(String(normalized));
  };

  const commitParticipantsInput = () => {
    const trimmed = participantsInput.trim();

    if (trimmed === '') {
      setParticipantsInput(String(maxParticipants));
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setParticipantsInput(String(maxParticipants));
      return;
    }

    const normalized = Math.max(minParticipants, Math.floor(parsed));
    // Flag when the typed value got clamped up by the ENROLLMENT floor —
    // otherwise the silent reset reads as a bug rather than the floor doing
    // its job. Gated on currentEnrolled > 0 (same guard as isBelowEnrolled):
    // with zero enrolled the floor is just "minst 1 plass", where the hint's
    // "{0} er allerede påmeldt" copy would be untrue — that case keeps the
    // existing silent reset to a valid value.
    setShowClampHint(currentEnrolled > 0 && parsed < minParticipants);
    if (normalized !== maxParticipants) {
      onMaxParticipantsChange(normalized);
    }
    setParticipantsInput(String(normalized));
  };

  // Copies the picked place's name, address and coords into the form state.
  const handleLocationChange = (next: {
    name: string;
    address: string;
    coords: LocationCoords | null;
  }) => {
    onLocationChange(next.name);
    onLocationAddressChange(next.address);
    onLocationCoordsChange(next.coords);
  };


  // Plasser error state — derived once for both the input and the label.
  const participantsTypedValue = parseInt(participantsInput, 10);
  const participantsHasTyped = participantsInput.trim() !== '';
  // Only an error WHILE the user is typing a value below current enrollment.
  // After blur, the input is clamped back to a valid value, so the error
  // clears. Capacity == currentEnrolled (course is full) is a valid state.
  const isBelowEnrolled =
    participantsHasTyped &&
    !isNaN(participantsTypedValue) &&
    currentEnrolled > 0 &&
    participantsTypedValue < currentEnrolled;
  const showParticipantsError = isBelowEnrolled || showClampHint;

  return (
    <div className="w-full">
      <SettingsRows>
        <SettingsRow
          title="Bilde"
          id="course-edit-image"
          description="Vises på kurskortet og kurssiden."
        >
          <ImageField
            value={settingsImageUrl}
            onChange={(file) => {
              onImageFileChange(file);
            }}
            onRemove={() => {
              if (settingsImageUrl) {
                onImageRemove();
              }
            }}
            disabled={isSaving || isImageSaving}
            loading={isImageSaving}
            className="max-w-sm"
          />
        </SettingsRow>

        <SettingsRow title="Detaljer" description="Tittel og beskrivelse slik de vises på kurssiden.">
          <div>
            <Label htmlFor="settings-title" data-error={titleError ? true : undefined} className="mb-2">Tittel</Label>
            <Input
              id="settings-title"
              type="text"
              value={settingsTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              aria-invalid={titleError ? 'true' : undefined}
              aria-describedby={titleError ? 'settings-title-error' : undefined}
              className="text-base"
            />
            {titleError && (
              <FieldError id="settings-title-error">
                {titleError}
              </FieldError>
            )}
          </div>

          <div id="course-edit-description" className="scroll-mt-24">
            <Label id="settings-description-label" className="mb-2">Beskrivelse</Label>
            <RichTextEditor
              id="settings-description"
              aria-labelledby="settings-description-label"
              value={settingsDescription}
              onChange={onDescriptionChange}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          title="Sted og tid"
          id="course-edit-location"
          description="Hvor og når kurset holdes."
        >
          <div>
            <Label data-error={locationError ? true : undefined} className="mb-2">Sted</Label>
            <LocationField
              id="settings-location"
              value={settingsLocation}
              address={settingsLocationAddress}
              coords={settingsLocationCoords}
              onChange={handleLocationChange}
            />
            {locationError && (
              <FieldError id="settings-location-error">
                {locationError}
              </FieldError>
            )}
          </div>

          {courseFormat === 'single' ? (
              /* Per-day editor for single/enkeltkurs courses */
              <div>
                <SessionDaysEditor
                  value={sessionDays}
                  onChange={onSessionDaysChange}
                  readOnly={isPublished}
                />
                {isPublished && sessionDays.length > 1 && (
                  <p className="mt-2 text-sm text-foreground-muted">
                    Du kan ikke legge til eller fjerne dager på publiserte kurs. Kontakt deltakerne ved endringer i antall dager.
                  </p>
                )}
              </div>
            ) : (
              /* Series: start date + time. Once published, the start date is
                 in the past and per-session time changes happen on Oversikt
                 (notifies påmeldte) — so the fields stay visible but locked,
                 with a tooltip explaining why. */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label id="settings-date-label" className="mb-2">Startdato</Label>
                  <ScheduleLockTooltip locked={isPublished}>
                    <DatePicker
                      aria-labelledby="settings-date-label"
                      value={settingsDate}
                      onChange={onDateChange}
                      placeholder="Velg dato"
                      disabled={isPublished}
                    />
                  </ScheduleLockTooltip>
                </div>
                <div>
                  <Label id="settings-time-label" className="mb-2">Tidspunkt</Label>
                  <ScheduleLockTooltip locked={isPublished}>
                    <div className="flex items-center gap-2">
                      <Select
                        value={settingsTime}
                        disabled={isPublished}
                        onValueChange={(val) => {
                          onTimeChange(val);
                          // If current end time is now invalid, clear duration
                          if (endTime && timeToMin(endTime) <= timeToMin(val)) {
                            onDurationChange(null);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full" aria-label="Starttid">
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectGroup>
                            {ALL_TIME_SLOTS.map((slot) => (
                              <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <span className="text-base font-medium shrink-0 text-foreground-muted">–</span>
                      <Select
                        value={endTime}
                        disabled={isPublished}
                        onValueChange={handleEndTimeChange}
                      >
                        <SelectTrigger className="w-full" aria-label="Sluttid">
                          <SelectValue placeholder="Slutt" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectGroup>
                            {endTimeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </ScheduleLockTooltip>
                </div>
              </div>
            )}
        </SettingsRow>

        <SettingsRow
          title="Påmelding"
          description="Plasser og pris for nye påmeldinger."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="settings-capacity" data-error={showParticipantsError ? true : undefined} className="mb-2">
                Plasser
              </Label>
              <Input
                id="settings-capacity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={participantsInput}
                onChange={(e) => {
                  const nextValue = e.target.value.replace(/[^\d]/g, '');
                  setParticipantsInput(nextValue);
                  if (showClampHint) setShowClampHint(false);
                }}
                onBlur={commitParticipantsInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitParticipantsInput();
                  }
                }}
                aria-invalid={showParticipantsError ? 'true' : undefined}
                className="text-left"
              />
              {showParticipantsError && (
                <FieldError className="tabular-nums">
                  {currentEnrolled} er allerede påmeldt — kan ikke være lavere.
                </FieldError>
              )}
            </div>
            <div>
              <Label htmlFor="settings-price" className="mb-2">
                {courseFormat === 'series' ? 'Pris for hele kurset' : 'Pris'}
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="settings-price"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={commitPriceInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitPriceInput();
                    }
                  }}
                />
                <InputGroupAddon align="inline-end" aria-hidden="true">kr</InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </SettingsRow>
      </SettingsRows>

      {/* Destructive zone. "Gjør til utkast" lives in the header kebab menu
          (state change, not destructive). Danger-tinted surface for actions
          that destroy or invalidate data:
          - draft → just Slett (no signups to refund)
          - live (upcoming/active, not yet ended) → Avlys (refund + notify)
          - finished (completed) → Slett only when empty; a finished course with
            participants offers nothing here — Avlys would refund a delivered
            course, and deleting would cascade-destroy retained payment records.
          - cancelled → just Slett (final cleanup) */}
      {(() => {
        const isDraft = courseStatus === 'draft';
        const isCancelled = courseStatus === 'cancelled';
        const isFinished = courseStatus === 'completed';
        // Live = published and still running (not draft, cancelled, or ended).
        const isLive = !isDraft && !isCancelled && !isFinished;
        const showCancel = isLive;
        // A finished course is only safe to hard-delete when it has no signup
        // records at all — cancelled signups still carry retained payment data.
        const showDelete = isDraft || isCancelled || (isFinished && !hasSignupRecords);
        if (!showCancel && !showDelete) return null;
        return (
          // Destructive zone: plain hairline rows, no red-tinted panel
          // (ui-patterns §2.4) — matches TeacherProfilePage.
          <section className="mt-12">
            <div className="divide-y divide-border-subtle">
              {showCancel && (
                <ActionRow
                  title="Avlys kurset"
                  sub="Stenger påmelding og refunderer alle påmeldte."
                  buttonLabel="Avlys kurs"
                  onClick={onRequestCancel}
                  tone="danger"
                />
              )}
              {showDelete && (
                <ActionRow
                  title="Slett kurset"
                  sub="Fjerner kurset og all tilhørende data permanent."
                  buttonLabel="Slett kurs"
                  onClick={onRequestDelete}
                  tone="danger"
                />
              )}
            </div>
          </section>
        );
      })()}

      <DirtyFormBar
        visible={isDirty || !!saveError}
        error={saveError}
        isSaving={isSaving || isImageSaving}
        onSave={() => {
          commitParticipantsInput();
          onSave();
        }}
        onCancel={onCancel}
      />
    </div>
  );
};

interface ActionRowProps {
  title: string;
  sub: string;
  buttonLabel: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

/** Wraps a disabled schedule field with a tooltip explaining the lock —
 *  a no-op passthrough when `locked` is false. */
function ScheduleLockTooltip({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{children}</div>
      </TooltipTrigger>
      <TooltipContent>Endre timene fra Timeplan på Oversikt-fanen.</TooltipContent>
    </Tooltip>
  );
}

function ActionRow({ title, sub, buttonLabel, onClick, tone = 'default' }: ActionRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-foreground-muted">{sub}</p>
      </div>
      <Button
        variant={tone === 'danger' ? 'destructive' : 'secondary'}
        onClick={onClick}
        className="shrink-0"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
